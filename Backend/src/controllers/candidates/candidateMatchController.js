const {
  sequelize, Cv_document, Job_post, Company, User,
  Job_skill, Skill, Skill_alias, Ai_task, Match_result,
} = require("../../models");
const crypto = require("node:crypto");
const { Op } = require("sequelize");
const AppError = require("../../utils/AppError");

function assertObjectBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError(400, "INVALID_BODY", "Body phải là một object JSON.");
  }
}

function parsePositiveInteger(value, name) {
  if ((typeof value !== "string" && typeof value !== "number") || !/^[1-9]\d*$/.test(String(value))) {
    throw new AppError(400, "INVALID_NUMBER", name + " phải là số nguyên dương.");
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    throw new AppError(400, "INVALID_NUMBER", name + " vượt quá giới hạn cho phép.");
  }
  return number;
}

function parsePagination(query) {
  const page = parsePositiveInteger(query.page ?? 1, "page");
  const limit = parsePositiveInteger(query.limit ?? 20, "limit");
  const offset = (page - 1) * limit;
  if (limit > 100 || !Number.isSafeInteger(offset)) {
    throw new AppError(400, "INVALID_PAGINATION", "limit tối đa 100 và page phải hợp lệ.");
  }
  return { page, limit, offset };
}

function paginatedResponse(data, total, page, limit) {
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// Chỉ so khớp tên kỹ năng và alias trong văn bản CV. Đây không phải kết quả từ nhà cung cấp AI.
function findEvidence(text, terms) {
  const source = text.toLocaleLowerCase("vi");
  for (const term of terms) {
    const keyword = term.toLocaleLowerCase("vi");
    let index = source.indexOf(keyword);
    while (index !== -1) {
      const before = source[index - 1] || "";
      const after = source[index + keyword.length] || "";
      if (!/[\p{L}\p{N}_]/u.test(before) && !/[\p{L}\p{N}_]/u.test(after)) {
        return text.slice(Math.max(0, index - 60), Math.min(text.length, index + keyword.length + 60));
      }
      index = source.indexOf(keyword, index + 1);
    }
  }
  return null;
}

exports.createCvMatches = async (req, res, next) => {
  try {
    const cvId = parsePositiveInteger(req.params.cvId, "cvId");
    assertObjectBody(req.body);
    let jobIds;
    if (req.body.jobIds !== undefined) {
      if (!Array.isArray(req.body.jobIds) || !req.body.jobIds.length || req.body.jobIds.length > 20) throw new AppError(400, "INVALID_JOBS", "jobIds cần từ 1 đến 20 ID.");
      jobIds = [...new Set(req.body.jobIds.map(id => parsePositiveInteger(id, "jobId")))];
    }
    const cv = await Cv_document.findOne({ where: { id: cvId, candidate_id: req.user.id, archived_at: null } });
    if (!cv) return next(new AppError(404, "CV_NOT_FOUND", "Không tìm thấy CV."));
    if (cv.processing_status !== "READY" || !cv.raw_text?.trim()) return next(new AppError(409, "CV_NOT_PARSED", "Hãy trích xuất văn bản CV trước khi đối chiếu."));
    const companyInclude = { model: Company, as: "company", where: { verification_status: "VERIFIED" }, required: true,
      attributes: ["id", "name"], include: [{ model: User, as: "user", where: { status: "ACTIVE" }, attributes: [], required: true }] };
    const jobs = await Job_post.findAll({ where: { status: "PUBLISHED", is_hidden: false, application_deadline: { [Op.gt]: new Date() }, ...(jobIds ? { id: jobIds } : {}) },
      include: [companyInclude], order: [["published_at", "DESC"], ["id", "DESC"]], limit: 20,
    });
    if (jobIds && jobs.length !== jobIds.length) return next(new AppError(404, "JOB_NOT_FOUND", "Một hoặc nhiều tin không còn nhận hồ sơ."));
    const results = [];
    for (const selected of jobs) {
      const result = await sequelize.transaction(async (transaction) => {
        const job = await Job_post.findOne({ where: { id: selected.id, status: "PUBLISHED", is_hidden: false, application_deadline: { [Op.gt]: new Date() } }, include: [companyInclude], transaction, lock: transaction.LOCK.UPDATE });
        if (!job) return null;
        const skills = await Job_skill.findAll({ where: { job_id: job.id }, include: [{ model: Skill, as: "skill", include: [{ model: Skill_alias, as: "aliases" }] }], transaction });
        const matched = [];
        const missing = [];
        const evidence = [];
        let totalWeight = 0;
        let matchedWeight = 0;
        for (const item of skills) {
          const weight = Number(item.importance) * (item.is_required ? 2 : 1);
          totalWeight += weight;
          const terms = [item.skill.name, ...item.skill.aliases.map(alias => alias.alias)];
          const quote = findEvidence(cv.raw_text, terms);
          const skill = { skillId: item.skill_id, name: item.skill.name, isRequired: item.is_required, importance: item.importance };
          if (quote) {
            matched.push(skill);
            matchedWeight += weight;
            evidence.push({ skillId: item.skill_id, text: quote });
          } else { missing.push(skill); }
        }
        const skillScore = totalWeight ? Math.round(10000 * matchedWeight / totalWeight) / 100 : null;
        // Chưa suy luận số tháng kinh nghiệm. Thiếu dữ liệu thì không tạo điểm tổng giả.
        const sufficient = totalWeight > 0 && Number(job.min_experience_months) === 0;
        const explanation = sufficient ? "Điểm tham khảo từ kỹ năng xuất hiện trong CV; chưa dùng mô hình AI." : "Chưa đủ cơ sở tính điểm tổng: tin thiếu kỹ năng hoặc cần đánh giá kinh nghiệm.";
        const input = { cvId: cv.id, fileAssetId: cv.file_asset_id, extractionVersion: cv.extraction_version,
          jobId: job.id, revision: job.revision, algorithm: "skill-overlap-v1", text: cv.raw_text,
          skills: skills.map(item => ({ id: item.skill_id, importance: item.importance, required: item.is_required, name: item.skill.name, aliases: item.skill.aliases.map(alias => alias.alias) })),
        };
        const inputHash = crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
        const task = await Ai_task.create({ requested_by: req.user.id, feature: "MATCH_CV", cv_id: cv.id, job_id: job.id,
          status: "SUCCEEDED", input_hash: inputHash, input_snapshot: input,
          output_json: { method: "skill-overlap-v1", skillScore, aiGenerated: false },
          prompt_version: "not-used", algorithm_version: "skill-overlap-v1", attempt_count: 1, started_at: new Date(), finished_at: new Date(),
        }, { transaction });
        return Match_result.create({ task_id: task.id, job_id: job.id, cv_id: cv.id, application_id: null,
          job_revision: job.revision, cv_extraction_version: cv.extraction_version, input_hash: inputHash, algorithm_version: "skill-overlap-v1",
          evidence_status: sufficient ? "SUFFICIENT" : "INSUFFICIENT", skill_score: skillScore, experience_score: null,
          total_score: sufficient ? skillScore : null, matched_skills: matched, missing_skills: missing, evidence, explanation,
          suggestions: missing.map(item => "Bổ sung bằng chứng cho kỹ năng " + item.name + " nếu bạn có kinh nghiệm thực tế."),
        }, { transaction });
      });
      if (result) results.push(result);
    }
    return res.status(201).json({ message: "Đã đối chiếu kỹ năng bằng quy tắc; đây chưa phải phân tích AI.", data: results });
  } catch (error) {
    return next(error);
  }
};

exports.listCvMatches = async (req, res, next) => {
  try {
    const cvId = parsePositiveInteger(req.params.cvId, "cvId");
    const cv = await Cv_document.findOne({ where: { id: cvId, candidate_id: req.user.id } });
    if (!cv) return next(new AppError(404, "CV_NOT_FOUND", "Không tìm thấy CV."));
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, count } = await Match_result.findAndCountAll({ where: { cv_id: cvId, application_id: null },
      include: [{ model: Ai_task, as: "task", where: { requested_by: req.user.id }, attributes: ["id", "status"], required: true },
        { model: Job_post, as: "job", attributes: ["id", "title", "revision", "status"] }],
      order: [["id", "DESC"]], limit, offset,
    });
    return res.status(200).json(paginatedResponse(rows, count, page, limit));
  } catch (error) {
    return next(error);
  }
};

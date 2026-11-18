const { Op } = require("sequelize");
const { Cv_document, Job_post, Company, User, Job_skill, Skill, Match_result } = require("../../models");
const AppError = require("../../utils/AppError");
const { executeAiTask } = require("../../services/aiService");
const { cvSchema, matchSchema, baseInstructions, assertEvidence, validateCvEvidence } = require("../../services/recruitmentAiSchemas");

function positiveId(value) {
  if (!["string", "number"].includes(typeof value) || !/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw new AppError(400, "INVALID_ID", "Mã CV hoặc tin tuyển dụng không hợp lệ.");
  return Number(value);
}

async function readyCv(cvId, userId, options = {}) {
  const cv = await Cv_document.findOne({ where: { id: cvId, candidate_id: userId, archived_at: null }, ...options });
  if (!cv) throw new AppError(404, "CV_NOT_FOUND", "Không tìm thấy CV đang hoạt động.");
  if (cv.processing_status !== "READY" || !cv.raw_text?.trim()) throw new AppError(409, "CV_NOT_PARSED", "Hãy trích xuất văn bản PDF thành công trước khi dùng AI.");
  return cv;
}

function assertSameCv(current, source) {
  if (String(current.extraction_version) !== String(source.extraction_version) || String(current.file_asset_id) !== String(source.file_asset_id)) {
    throw new AppError(409, "AI_SOURCE_CHANGED", "Văn bản CV đã thay đổi trong lúc AI xử lý. Hãy tải lại CV và phân tích lại.");
  }
}

exports.analyzeCv = async (req, res, next) => {
  try {
    const id = positiveId(req.params.cvId);
    const cv = await readyCv(id, req.user.id);
    const input = { cvText: cv.raw_text, sourceVersion: cv.extraction_version };
    const result = await executeAiTask({
      userId: req.user.id, feature: "PARSE_CV", references: { cv_id: id }, input, schema: cvSchema,
      instructions: baseInstructions + " Extract a concise factual profile with skills, education, work experience and projects. Every listed item must include an exact verbatim substring of cvText as evidence. Use empty arrays for absent sections and empty strings for unknown fields. Do not estimate experience duration.",
      validate: (output) => validateCvEvidence(cv.raw_text, output),
      persist: async (output, task, transaction) => {
        const current = await readyCv(id, req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
        assertSameCv(current, cv);
        const profile = { ...output, task_id: task.id, model: task.model_name, extraction_version: cv.extraction_version, analyzed_at: new Date().toISOString() };
        await current.update({ parsed_data: { ...(current.parsed_data || {}), structured_profile: profile } }, { transaction });
        return profile;
      },
    });
    return res.status(201).json(result);
  } catch (error) { return next(error); }
};

function eligibleJobWhere(id) {
  return { id, status: "PUBLISHED", is_hidden: false, application_deadline: { [Op.gt]: new Date() } };
}

const eligibleCompany = { model: Company, as: "company", attributes: ["id", "name"], where: { verification_status: "VERIFIED" }, required: true,
  include: [{ model: User, as: "user", attributes: [], where: { status: "ACTIVE" }, required: true }] };

exports.matchCv = async (req, res, next) => {
  try {
    const cvId = positiveId(req.params.cvId);
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) throw new AppError(400, "INVALID_BODY", "Hãy chọn một tin tuyển dụng để đối chiếu AI.");
    const jobId = positiveId(req.body.jobId);
    const cv = await readyCv(cvId, req.user.id);
    const job = await Job_post.findOne({ where: eligibleJobWhere(jobId), include: [eligibleCompany] });
    if (!job) throw new AppError(404, "JOB_NOT_FOUND", "Tin tuyển dụng không còn nhận hồ sơ.");
    const rows = await Job_skill.findAll({ where: { job_id: jobId }, include: [{ model: Skill, as: "skill" }], order: [["skill_id", "ASC"]] });
    if (!rows.length) throw new AppError(409, "JOB_HAS_NO_SKILLS", "Tin chưa có kỹ năng yêu cầu để đối chiếu.");
    if (rows.length > 100) throw new AppError(413, "AI_TOO_MANY_SKILLS", "Tin có quá nhiều kỹ năng cho một lần đối chiếu AI.");
    const skills = rows.map((item) => ({ skillId: String(item.skill_id), name: item.skill.name, isRequired: Boolean(item.is_required), importance: Number(item.importance) }));
    const input = { cvText: cv.raw_text, sourceVersion: cv.extraction_version, jobId, jobRevision: job.revision, title: job.title, skills };
    const result = await executeAiTask({
      userId: req.user.id, feature: "MATCH_CV", references: { cv_id: cvId, job_id: jobId }, input, schema: matchSchema,
      instructions: baseInstructions + " For each supplied skill, determine only whether cvText contains direct evidence of that skill or a clearly equivalent technical concept. Return exactly one check for every skillId. For found=true, evidence must be an exact verbatim substring of cvText. For found=false use evidence='' and describe the missing evidence. Do not infer skills from employer or school prestige. Do not produce candidate suitability judgments.",
      validate: (output) => {
        const ids = new Set(output.checks.map((item) => item.skillId));
        if (output.checks.length !== skills.length || ids.size !== skills.length || skills.some((skill) => !ids.has(skill.skillId))) {
          throw new AppError(502, "AI_INVALID_SKILLS", "AI chưa đối chiếu đúng danh sách kỹ năng yêu cầu.");
        }
        for (const check of output.checks) {
          if (check.found) assertEvidence(cv.raw_text, check.evidence);
          else if (check.evidence !== "") throw new AppError(502, "AI_INVALID_OUTPUT", "AI trả về bằng chứng chưa nhất quán.");
        }
      },
      persist: async (output, task, transaction) => {
        const currentJob = await Job_post.findOne({ where: eligibleJobWhere(jobId), include: [eligibleCompany], transaction, lock: transaction.LOCK.UPDATE });
        if (!currentJob || String(currentJob.revision) !== String(job.revision)) throw new AppError(409, "AI_SOURCE_CHANGED", "Tin tuyển dụng đã thay đổi trong lúc AI xử lý. Hãy tải lại và đối chiếu lại.");
        const currentCv = await readyCv(cvId, req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
        assertSameCv(currentCv, cv);
        const checks = new Map(output.checks.map((item) => [item.skillId, item]));
        const matched = skills.filter((skill) => checks.get(skill.skillId).found);
        const missing = skills.filter((skill) => !checks.get(skill.skillId).found);
        const weight = (skill) => skill.importance * (skill.isRequired ? 2 : 1);
        const totalWeight = skills.reduce((sum, skill) => sum + weight(skill), 0);
        const foundWeight = matched.reduce((sum, skill) => sum + weight(skill), 0);
        const skillScore = totalWeight ? Math.round(10000 * foundWeight / totalWeight) / 100 : null;
        const sufficient = totalWeight > 0 && Number(job.min_experience_months) === 0;
        return Match_result.create({ task_id: task.id, job_id: jobId, cv_id: cvId, application_id: null,
          job_revision: job.revision, cv_extraction_version: cv.extraction_version, input_hash: task.input_hash,
          algorithm_version: task.algorithm_version, evidence_status: sufficient ? "SUFFICIENT" : "INSUFFICIENT",
          skill_score: skillScore, total_score: sufficient ? skillScore : null, experience_score: null,
          matched_skills: matched, missing_skills: missing,
          evidence: matched.map((skill) => ({ skillId: skill.skillId, text: checks.get(skill.skillId).evidence })),
          explanation: "AI tìm bằng chứng kỹ năng trong CV; hệ thống kiểm tra trích dẫn và tính điểm theo trọng số yêu cầu. Kết quả hỗ trợ tham khảo, kinh nghiệm cần được đánh giá riêng.",
          suggestions: missing.map((skill) => "Bổ sung bằng chứng thực tế cho kỹ năng " + skill.name + " nếu bạn có kinh nghiệm sử dụng."),
        }, { transaction });
      },
    });
    return res.status(201).json(result);
  } catch (error) { return next(error); }
};

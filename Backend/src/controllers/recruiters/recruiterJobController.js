const {
  sequelize, Job_post, Company, Industry, Location,
  Job_level, Employment_type, Job_skill, Skill,
} = require("../../models");
const AppError = require("../../utils/AppError");

const jobFields = [
  "title",
  "description",
  "requirements",
  "benefits",
  "industry_id",
  "location_id",
  "level_id",
  "employment_type_id",
  "work_mode",
  "address",
  "salary_negotiable",
  "salary_min",
  "salary_max",
  "min_experience_months",
  "education_requirement",
  "vacancies",
  "application_deadline",
];

const jobIncludes = [
  {
    model: Company,
    as: "company",
    attributes: ["id", "name", "verification_status"],
  },
  { model: Industry, as: "industry", attributes: ["id", "name"] },
  { model: Location, as: "location", attributes: ["id", "name"] },
  { model: Job_level, as: "level", attributes: ["id", "name"] },
  { model: Employment_type, as: "employmentType", attributes: ["id", "name"] },
  {
    model: Skill,
    as: "skills",
    attributes: ["id", "name"],
    through: { attributes: ["is_required", "importance"] },
  },
];

function assertBoundedInteger(value, name, min, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if ((typeof value !== "string" && typeof value !== "number") || !/^\d+$/.test(String(value)) || !Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new AppError(400, "INVALID_JOB_FIELD", `${name} không hợp lệ.`);
  }
  return parsed;
}

async function validateJobData(data) {
  const stringLimits = {
    title: 200,
    description: 65535,
    requirements: 65535,
    benefits: 65535,
    address: 300,
    education_requirement: 200,
  };
  for (const [field, max] of Object.entries(stringLimits)) {
    if (
      Object.hasOwn(data, field) &&
      data[field] !== null &&
      (typeof data[field] !== "string" || data[field].length > max)
    ) {
      throw new AppError(400, "INVALID_JOB_FIELD", `${field} không hợp lệ.`);
    }
  }
  if (Object.hasOwn(data, "title") && !data.title?.trim()) {
    throw new AppError(400, "INVALID_JOB_TITLE", "Tiêu đề công việc không được để trống.");
  }
  for (const [field, Model] of [
    ["industry_id", Industry],
    ["location_id", Location],
    ["level_id", Job_level],
    ["employment_type_id", Employment_type],
  ]) {
    if (Object.hasOwn(data, field) && data[field] !== null) {
      const id = parsePositiveInteger(data[field], field);
      if (!(await Model.findOne({ where: { id, is_active: true } }))) {
        throw new AppError(400, "INVALID_JOB_REFERENCE", `${field} không hợp lệ hoặc đã bị tắt.`);
      }
      data[field] = id;
    }
  }
  if (
    Object.hasOwn(data, "work_mode") &&
    !["ONSITE", "HYBRID", "REMOTE"].includes(data.work_mode)
  ) {
    throw new AppError(400, "INVALID_WORK_MODE", "work_mode không hợp lệ.");
  }
  if (Object.hasOwn(data, "salary_negotiable") && typeof data.salary_negotiable !== "boolean") {
    throw new AppError(400, "INVALID_SALARY", "salary_negotiable phải là boolean.");
  }
  for (const field of ["salary_min", "salary_max"]) {
    if (Object.hasOwn(data, field) && data[field] !== null) {
      if ((typeof data[field] !== "string" && typeof data[field] !== "number") ||
          !/^\d{1,13}(?:\.\d{1,2})?$/.test(String(data[field])) || Number(data[field]) < 0) {
        throw new AppError(400, "INVALID_SALARY", `${field} phải là số không âm, tối đa 2 chữ số thập phân.`);
      }
    }
  }
  for (const [field, min] of [
    ["min_experience_months", 0],
    ["vacancies", 1],
  ]) {
    if (Object.hasOwn(data, field)) {
      data[field] = assertBoundedInteger(data[field], field, min, 4294967295);
    }
  }
  if (Object.hasOwn(data, "application_deadline") && data.application_deadline !== null) {
    if (typeof data.application_deadline !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(data.application_deadline)) {
      throw new AppError(400, "INVALID_DEADLINE", "Hạn nộp phải là ISO 8601 có múi giờ.");
    }
    const deadline = new Date(data.application_deadline);
    if (Number.isNaN(deadline.getTime())) {
      throw new AppError(400, "INVALID_DEADLINE", "application_deadline không phải ngày hợp lệ.");
    }
    data.application_deadline = deadline;
  }
}

function validateSalary(job) {
  if (job.salary_negotiable) {
    if (job.salary_min != null || job.salary_max != null) {
      throw new AppError(
        400,
        "INVALID_SALARY",
        "Mức lương phải để trống khi chọn thương lượng.",
      );
    }
    return;
  }
  if (
    job.salary_min == null ||
    job.salary_max == null ||
    Number(job.salary_min) < 0 ||
    Number(job.salary_max) < Number(job.salary_min)
  ) {
    throw new AppError(
      400,
      "INVALID_SALARY",
      "Khi không thương lượng, cần salary_min và salary_max hợp lệ.",
    );
  }
}

async function getPublishErrors(job, transaction) {
  const missing = [];
  for (const field of [
    "description",
    "requirements",
    "industry_id",
    "level_id",
    "employment_type_id",
    "application_deadline",
  ]) {
    if (job[field] == null || (typeof job[field] === "string" && !job[field].trim())) {
      missing.push(field);
    }
  }
  if (
    job.work_mode !== "REMOTE" &&
    (job.location_id == null || (typeof job.location_id === "string" && !job.location_id.trim()))
  ) {
    missing.push("location_id");
  }
  if (job.work_mode !== "REMOTE" && !job.address?.trim()) missing.push("address");
  if (job.application_deadline && new Date(job.application_deadline) <= new Date()) {
    missing.push("application_deadline (phải ở tương lai)");
  }
  if (job.salary_negotiable) {
    if (job.salary_min != null || job.salary_max != null) {
      missing.push("salary_min/salary_max (phải để trống khi thương lượng)");
    }
  } else if (
    job.salary_min == null ||
    job.salary_max == null ||
    Number(job.salary_min) < 0 ||
    Number(job.salary_max) < Number(job.salary_min)
  ) {
    missing.push("salary_min/salary_max");
  }
  for (const [field, Model] of [["industry_id", Industry], ["location_id", Location], ["level_id", Job_level], ["employment_type_id", Employment_type]]) {
    if (job[field] != null && !(await Model.findOne({ where: { id: job[field], is_active: true }, transaction }))) {
      missing.push(field + " (đã bị tắt)");
    }
  }
  const requiredSkills = await Job_skill.count({ where: { job_id: job.id, is_required: true },
    include: [{ model: Skill, as: "skill", where: { is_active: true }, required: true }], transaction });
  if (!requiredSkills) missing.push("skills (cần ít nhất một kỹ năng bắt buộc đang hoạt động)");
  return missing;
}

async function findOwnedJob(userId, jobId, options = {}) {
  const company = await getCompany(userId);
  const job = await Job_post.findOne({
    where: { id: jobId, company_id: company.id },
    ...options,
  });
  if (!job) throw new AppError(404, "JOB_NOT_FOUND", "Không tìm thấy tin tuyển dụng.");
  return { company, job };
}

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

function pickAllowedFields(body, fields) {
  assertObjectBody(body);
  const data = {};
  for (const field of fields) {
    if (Object.hasOwn(body, field)) data[field] = body[field];
  }
  return data;
}

function paginatedResponse(data, total, page, limit) {
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getCompany(userId, options = {}) {
  const company = await Company.findOne({ where: { user_id: userId }, ...options });
  if (!company) {
    throw new AppError(404, "COMPANY_PROFILE_NOT_FOUND", "Chưa tìm thấy hồ sơ công ty.");
  }
  return company;
}

exports.listJobs = async (req, res, next) => {
  try {
    const company = await getCompany(req.user.id);
    const { page, limit, offset } = parsePagination(req.query);
    const where = { company_id: company.id };
    if (req.query.status !== undefined) {
      const statuses = ["DRAFT", "NEEDS_CHANGES", "PUBLISHED", "CLOSED", "EXPIRED"];
      if (!statuses.includes(req.query.status)) {
        throw new AppError(400, "INVALID_JOB_STATUS", "status không hợp lệ.");
      }
      where.status = req.query.status;
    }
    const { rows, count } = await Job_post.findAndCountAll({
      where,
      include: jobIncludes,
      distinct: true,
      order: [["created_at", "DESC"], ["id", "DESC"]],
      limit,
      offset,
    });
    return res.json(paginatedResponse(rows, count, page, limit));
  } catch (error) {
    return next(error);
  }
};

exports.createJob = async (req, res, next) => {
  try {
    const company = await getCompany(req.user.id);
    const data = pickAllowedFields(req.body, jobFields);
    await validateJobData(data);
    validateSalary({
      salary_negotiable: data.salary_negotiable ?? true,
      salary_min: data.salary_min ?? null,
      salary_max: data.salary_max ?? null,
    });
    const job = await Job_post.create({
      ...data,
      company_id: company.id,
      status: "DRAFT",
      is_hidden: false,
      revision: 1,
    });
    return res.status(201).json({ message: "Đã tạo tin nháp.", data: job });
  } catch (error) {
    return next(error);
  }
};

exports.getJob = async (req, res, next) => {
  try {
    const jobId = parsePositiveInteger(req.params.jobId, "jobId");
    const company = await getCompany(req.user.id);
    const job = await Job_post.findOne({
      where: { id: jobId, company_id: company.id },
      include: jobIncludes,
    });
    if (!job) throw new AppError(404, "JOB_NOT_FOUND", "Không tìm thấy tin tuyển dụng.");
    return res.json({ data: job });
  } catch (error) {
    return next(error);
  }
};

exports.updateJob = async (req, res, next) => {
  try {
    const jobId = parsePositiveInteger(req.params.jobId, "jobId");
    const data = pickAllowedFields(req.body, jobFields);
    const revision = parsePositiveInteger(req.body.revision, "revision");
    await validateJobData(data);
    const result = await sequelize.transaction(async (transaction) => {
      const { job } = await findOwnedJob(req.user.id, jobId, { transaction, lock: transaction.LOCK.UPDATE });
      if (Number(job.revision) !== revision) throw new AppError(409, "REVISION_CONFLICT", "Tin đã được sửa. Hãy tải lại trước khi lưu.");
      const values = { ...job.get({ plain: true }), ...data };
      validateSalary(values);
      const fields = job.status === "PUBLISHED" ? await getPublishErrors(values, transaction) : [];
      await job.update({ ...data, revision: Number(job.revision) + 1,
        ...(job.status === "PUBLISHED" ? { status: fields.length ? "NEEDS_CHANGES" : "PUBLISHED", validation_errors: fields.length ? fields : null } : {}),
      }, { transaction });
      return { job, fields };
    });
    if (result.fields.length) return res.status(422).json({ error: { code: "JOB_NEEDS_CHANGES", message: "Đã lưu tin; cần bổ sung trước khi công khai.", fields: result.fields }, data: result.job });
    return res.status(200).json({ message: "Đã cập nhật tin tuyển dụng.", data: result.job });
  } catch (error) {
    return next(error);
  }
};

exports.publishJob = async (req, res, next) => {
  try {
    const jobId = parsePositiveInteger(req.params.jobId, "jobId");
    const result = await sequelize.transaction(async (transaction) => {
      const { company, job } = await findOwnedJob(req.user.id, jobId, { transaction, lock: transaction.LOCK.UPDATE });
      if (company.verification_status !== "VERIFIED") throw new AppError(403, "COMPANY_NOT_VERIFIED", "Công ty cần được xác minh trước khi đăng tin.");
      if (!["DRAFT", "NEEDS_CHANGES", "CLOSED", "EXPIRED"].includes(job.status)) throw new AppError(409, "JOB_NOT_PUBLISHABLE", "Tin không ở trạng thái có thể đăng.");
      const fields = await getPublishErrors(job.get({ plain: true }), transaction);
      await job.update({ status: fields.length ? "NEEDS_CHANGES" : "PUBLISHED",
        validation_errors: fields.length ? fields : null,
        ...(fields.length ? {} : { published_at: new Date() }), revision: Number(job.revision) + 1,
      }, { transaction });
      return { job, fields };
    });
    if (result.fields.length) return res.status(422).json({ error: { code: "JOB_NOT_READY_TO_PUBLISH", message: "Tin chưa đủ điều kiện đăng.", fields: result.fields }, data: result.job });
    return res.status(200).json({ message: "Đã đăng tin tuyển dụng.", data: result.job });
  } catch (error) {
    return next(error);
  }
};

exports.closeJob = async (req, res, next) => {
  try {
    const jobId = parsePositiveInteger(req.params.jobId, "jobId");
    const job = await sequelize.transaction(async (transaction) => {
      const { job } = await findOwnedJob(req.user.id, jobId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!["PUBLISHED", "DRAFT", "NEEDS_CHANGES"].includes(job.status)) throw new AppError(409, "JOB_NOT_CLOSABLE", "Tin không ở trạng thái có thể đóng.");
      await job.update({ status: "CLOSED", revision: Number(job.revision) + 1 }, { transaction });
      return job;
    });
    return res.status(200).json({ message: "Đã đóng tin tuyển dụng.", data: job });
  } catch (error) {
    return next(error);
  }
};

exports.replaceJobSkills = async (req, res, next) => {
  try {
    const jobId = parsePositiveInteger(req.params.jobId, "jobId");
    assertObjectBody(req.body);
    const revision = parsePositiveInteger(req.body.revision, "revision");
    if (!Array.isArray(req.body.skills) || req.body.skills.length > 100) throw new AppError(400, "INVALID_SKILLS", "skills phải là mảng tối đa 100 kỹ năng.");
    const skills = [];
    const seen = new Set();
    for (const item of req.body.skills) {
      assertObjectBody(item);
      const skillId = parsePositiveInteger(item.skillId, "skillId");
      if (seen.has(skillId)) throw new AppError(400, "DUPLICATE_SKILL", "Danh sách có kỹ năng bị trùng.");
      seen.add(skillId);
      const isRequired = item.isRequired ?? true;
      const importance = item.importance ?? 1;
      if (typeof isRequired !== "boolean" || !Number.isInteger(importance) || importance < 1 || importance > 5) throw new AppError(400, "INVALID_SKILL_SETTINGS", "isRequired hoặc importance không hợp lệ.");
      skills.push({ skill_id: skillId, is_required: isRequired, importance });
    }
    const result = await sequelize.transaction(async (transaction) => {
      const { job } = await findOwnedJob(req.user.id, jobId, { transaction, lock: transaction.LOCK.UPDATE });
      if (Number(job.revision) !== revision) throw new AppError(409, "REVISION_CONFLICT", "Tin đã được sửa. Hãy tải lại trước khi lưu.");
      if (skills.length) {
        const count = await Skill.count({ where: { id: skills.map(item => item.skill_id), is_active: true }, transaction });
        if (count !== skills.length) throw new AppError(400, "UNKNOWN_SKILL", "Kỹ năng không tồn tại hoặc đã bị tắt.");
      }
      await Job_skill.destroy({ where: { job_id: jobId }, transaction });
      if (skills.length) await Job_skill.bulkCreate(skills.map(item => ({ ...item, job_id: jobId })), { transaction });
      const fields = job.status === "PUBLISHED" ? await getPublishErrors(job.get({ plain: true }), transaction) : [];
      await job.update({ revision: Number(job.revision) + 1,
        ...(job.status === "PUBLISHED" ? { status: fields.length ? "NEEDS_CHANGES" : "PUBLISHED", validation_errors: fields.length ? fields : null } : {}),
      }, { transaction });
      return { revision: job.revision, fields };
    });
    return res.status(result.fields.length ? 422 : 200).json({
      message: "Đã cập nhật kỹ năng yêu cầu.", data: skills, revision: result.revision,
      ...(result.fields.length ? { error: { code: "JOB_NEEDS_CHANGES", message: "Tin cần được bổ sung.", fields: result.fields } } : {}),
    });
  } catch (error) {
    return next(error);
  }
};

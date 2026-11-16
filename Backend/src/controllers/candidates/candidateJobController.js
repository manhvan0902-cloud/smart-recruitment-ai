const {
  sequelize, Job_post, Company, Industry, Location,
  Job_level, Employment_type, Skill, User, Saved_job, Application,
} = require("../../models");
const { Op } = require("sequelize");
const AppError = require("../../utils/AppError");

const jobIncludes = [
  {
    model: Company,
    as: "company",
    attributes: ["id", "user_id", "name", "description", "website", "company_size", "verification_status"],
    where: { verification_status: "VERIFIED" },
    required: true,
    include: [{ model: User, as: "user", where: { status: "ACTIVE" }, attributes: [], required: true }],
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

function availableJobWhere() {
  return {
    status: "PUBLISHED",
    is_hidden: false,
    application_deadline: { [Op.gt]: new Date() },
  };
}

function addNumericFilter(where, query, parameter, field) {
  if (query[parameter] !== undefined) {
    where[field] = parsePositiveInteger(query[parameter], parameter);
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

exports.listJobs = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const where = availableJobWhere();
    const filters = [
      ["industryId", "industry_id"],
      ["locationId", "location_id"],
      ["levelId", "level_id"],
      ["employmentTypeId", "employment_type_id"],
    ];
    for (const [parameter, field] of filters) {
      addNumericFilter(where, req.query, parameter, field);
    }
    if (req.query.workMode) {
      if (!["ONSITE", "HYBRID", "REMOTE"].includes(req.query.workMode)) {
        throw new AppError(400, "INVALID_WORK_MODE", "workMode không hợp lệ.");
      }
      where.work_mode = req.query.workMode;
    }
    if (req.query.q !== undefined) {
      if (typeof req.query.q !== "string" || req.query.q.trim().length > 120) {
        throw new AppError(400, "INVALID_SEARCH", "Từ khóa tìm kiếm tối đa 120 ký tự.");
      }
      const term = `%${req.query.q.trim()}%`;
      where[Op.and] = [
        {
          [Op.or]: [
            { title: { [Op.like]: term } },
            { description: { [Op.like]: term } },
            { requirements: { [Op.like]: term } },
          ],
        },
      ];
    }

    const { rows, count } = await Job_post.findAndCountAll({
      where,
      include: jobIncludes,
      distinct: true,
      order: [["published_at", "DESC"], ["id", "DESC"]],
      limit,
      offset,
    });
    let savedIds = new Set();
    if (rows.length) {
      const saved = await Saved_job.findAll({
        where: { candidate_id: req.user.id, job_id: rows.map((job) => job.id) },
        attributes: ["job_id"],
      });
      savedIds = new Set(saved.map((item) => String(item.job_id)));
    }
    const data = rows.map((job) => ({ ...job.get({ plain: true }), is_saved: savedIds.has(String(job.id)) }));
    return res.json(paginatedResponse(data, count, page, limit));
  } catch (error) {
    return next(error);
  }
};

exports.getJob = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.jobId, "jobId");
    const job = await Job_post.findOne({
      where: { id, ...availableJobWhere() },
      include: jobIncludes,
    });
    if (!job) {
      throw new AppError(404, "JOB_NOT_FOUND", "Không tìm thấy việc làm đang tuyển.");
    }
    const saved = await Saved_job.findOne({ where: { candidate_id: req.user.id, job_id: job.id }, attributes: ["job_id"] });
    const application = await Application.findOne({ where: { candidate_id: req.user.id, job_id: job.id }, attributes: ["id", "status"] });
    return res.json({ data: { ...job.get({ plain: true }), is_saved: Boolean(saved),
      application_id: application?.id || null, application_status: application?.status || null } });
  } catch (error) {
    return next(error);
  }
};


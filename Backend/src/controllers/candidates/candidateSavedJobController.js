const {
  sequelize, Job_post, Company, Location, Saved_job, User,
} = require("../../models");
const { Op } = require("sequelize");
const AppError = require("../../utils/AppError");

const companyInclude = {
  model: Company, as: "company", attributes: ["id", "user_id", "name"],
  where: { verification_status: "VERIFIED" }, required: true,
  include: [{ model: User, as: "user", where: { status: "ACTIVE" }, attributes: [], required: true }],
};

function availableJobWhere() {
  return {
    status: "PUBLISHED",
    is_hidden: false,
    application_deadline: { [Op.gt]: new Date() },
  };
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

exports.listSavedJobs = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, count } = await Saved_job.findAndCountAll({
      where: { candidate_id: req.user.id },
      distinct: true,
      col: "job_id",
      include: [
        {
          model: Job_post,
          as: "job",
          include: [
            { model: Location, as: "location", attributes: ["id", "name"] },
            { model: Company, as: "company", attributes: ["id", "name", "verification_status"],
              include: [{ model: User, as: "user", attributes: ["status"] }] },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });
    const now = new Date();
    const data = rows.map((saved) => {
      const item = saved.get({ plain: true });
      const job = item.job;
      if (job) {
        job.is_saved = true;
        job.is_available = job.status === "PUBLISHED" && !job.is_hidden && job.application_deadline != null
          && new Date(job.application_deadline) > now && job.company?.verification_status === "VERIFIED"
          && job.company?.user?.status === "ACTIVE";
        if (job.company) delete job.company.user;
      }
      return item;
    });
    return res.json(paginatedResponse(data, count, page, limit));
  } catch (error) {
    return next(error);
  }
};

exports.saveJob = async (req, res, next) => {
  try {
    const jobId = parsePositiveInteger(req.params.jobId, "jobId");
    const job = await Job_post.findOne({ where: { id: jobId, ...availableJobWhere() }, include: [companyInclude] });
    if (!job) {
      throw new AppError(404, "JOB_NOT_FOUND", "Không tìm thấy việc làm đang tuyển.");
    }
    const [, created] = await Saved_job.findOrCreate({
      where: { candidate_id: req.user.id, job_id: jobId },
      defaults: { candidate_id: req.user.id, job_id: jobId },
    });
    return res.status(created ? 201 : 200).json({
      message: created ? "Đã lưu việc làm." : "Việc làm đã có trong danh sách lưu.",
    });
  } catch (error) {
    return next(error);
  }
};

exports.removeSavedJob = async (req, res, next) => {
  try {
    const jobId = parsePositiveInteger(req.params.jobId, "jobId");
    const count = await Saved_job.destroy({
      where: { candidate_id: req.user.id, job_id: jobId },
    });
    if (!count) {
      throw new AppError(404, "SAVED_JOB_NOT_FOUND", "Việc làm không có trong danh sách đã lưu.");
    }
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
};


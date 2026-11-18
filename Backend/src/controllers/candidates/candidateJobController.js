const {
  sequelize, Job_post, Company, Industry, Location,
  Job_level, Employment_type, Skill, User, Saved_job, Application,
} = require("../../models");
const AppError = require("../../utils/AppError");
const { availableJobWhere, buildJobWhere, parsePositiveInteger, parsePagination, paginatedResponse } = require("../../utils/jobQuery");

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

exports.listJobs = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const where = buildJobWhere(req.query);

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


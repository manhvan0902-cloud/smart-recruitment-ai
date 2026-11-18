const { Company, Job_post, User, Industry, Location, Job_level, Employment_type, Skill, Media_asset } = require("../../models");
const cloudinary = require("cloudinary").v2;
const AppError = require("../../utils/AppError");
const { availableJobWhere, buildJobWhere, parsePositiveInteger, parsePagination, paginatedResponse } = require("../../utils/jobQuery");

const companyAttributes = [
  "id", "name", "description", "website", "company_size", "address",
  "industry_id", "location_id", "verification_status",
];
const jobAttributes = [
  "id", "company_id", "title", "description", "requirements", "benefits",
  "industry_id", "location_id", "level_id", "employment_type_id", "work_mode", "address",
  "salary_negotiable", "salary_min", "salary_max", "currency", "salary_period",
  "min_experience_months", "education_requirement", "vacancies", "application_deadline", "published_at",
];
const activeCompanyAccount = {
  model: User, as: "user", where: { status: "ACTIVE" }, attributes: [], required: true,
};
const companyIncludes = [
  activeCompanyAccount,
  { model: Industry, as: "industry", attributes: ["id", "name"] },
  { model: Location, as: "location", attributes: ["id", "name"] },
  {
    model: Media_asset, as: "logo", attributes: ["public_id", "version", "mime_type"],
    where: { purpose: "LOGO", resource_type: "image", delivery_type: "upload" }, required: false,
  },
];
const jobIncludes = [
  {
    model: Company, as: "company",
    // Pagination selects the company in a subquery before joining its logo.
    attributes: [...companyAttributes, "logo_asset_id"],
    where: { verification_status: "VERIFIED" }, required: true, include: companyIncludes,
  },
  { model: Industry, as: "industry", attributes: ["id", "name"] },
  { model: Location, as: "location", attributes: ["id", "name"] },
  { model: Job_level, as: "level", attributes: ["id", "name"] },
  { model: Employment_type, as: "employmentType", attributes: ["id", "name"] },
  { model: Skill, as: "skills", attributes: ["id", "name"], through: { attributes: ["is_required", "importance"] } },
];

function publicCompanyData(company) {
  const data = company.get ? company.get({ plain: true }) : company;
  delete data.logo_asset_id;
  const logo = data.logo;
  data.logo = null;
  if (logo && process.env.CLOUDINARY_CLOUD_NAME) {
    data.logo = { url: cloudinary.url(logo.public_id, {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      version: logo.version,
      resource_type: "image",
      type: "upload",
      format: logo.mime_type === "image/jpeg" ? "jpg" : logo.mime_type.split("/")[1],
      secure: true,
    }) };
  }
  return data;
}

function publicJobData(job) {
  const data = job.get({ plain: true });
  data.company = publicCompanyData(data.company);
  return data;
}

exports.listJobs = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, count } = await Job_post.findAndCountAll({
      attributes: jobAttributes, where: buildJobWhere(req.query), include: jobIncludes,
      distinct: true, order: [["published_at", "DESC"], ["id", "DESC"]], limit, offset,
    });
    return res.json(paginatedResponse(rows.map(publicJobData), count, page, limit));
  } catch (error) {
    return next(error);
  }
};

exports.getJob = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.jobId, "jobId");
    const job = await Job_post.findOne({ attributes: jobAttributes, where: { id, ...availableJobWhere() }, include: jobIncludes });
    if (!job) throw new AppError(404, "JOB_NOT_FOUND", "Không tìm thấy việc làm đang tuyển.");
    return res.json({ data: publicJobData(job) });
  } catch (error) {
    return next(error);
  }
};

exports.getCompany = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.companyId, "companyId");
    const company = await Company.findOne({
      attributes: companyAttributes, where: { id, verification_status: "VERIFIED" }, include: companyIncludes,
    });
    if (!company) throw new AppError(404, "COMPANY_NOT_FOUND", "Không tìm thấy hồ sơ công ty công khai.");
    return res.json({ data: publicCompanyData(company) });
  } catch (error) {
    return next(error);
  }
};

exports.listCompanyJobs = async (req, res, next) => {
  try {
    const companyId = parsePositiveInteger(req.params.companyId, "companyId");
    const { page, limit, offset } = parsePagination(req.query);
    const company = await Company.findOne({
      attributes: ["id"], where: { id: companyId, verification_status: "VERIFIED" }, include: [activeCompanyAccount],
    });
    if (!company) throw new AppError(404, "COMPANY_NOT_FOUND", "Không tìm thấy hồ sơ công ty công khai.");
    const { rows, count } = await Job_post.findAndCountAll({
      attributes: jobAttributes, where: { ...buildJobWhere(req.query), company_id: companyId }, include: jobIncludes,
      distinct: true, order: [["published_at", "DESC"], ["id", "DESC"]], limit, offset,
    });
    return res.json(paginatedResponse(rows.map(publicJobData), count, page, limit));
  } catch (error) {
    return next(error);
  }
};

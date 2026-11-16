const {
  sequelize, Job_post, Company, Location, Job_skill,
  Skill, Candidate_profile, Cv_document, Media_asset, Application,
  User, Notification, Interview, Candidate_education, Candidate_experience,
  Candidate_project, Candidate_certification, Candidate_skill, Industry, Employment_type, Job_level,
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

async function getCandidateProfile(userId, options = {}) {
  const profile = await Candidate_profile.findOne({ where: { user_id: userId }, ...options });
  if (!profile) {
    throw new AppError(404, "PROFILE_NOT_FOUND", "Chưa tạo hồ sơ ứng viên.");
  }
  return profile;
}

function snapshot(instance, fields) {
  const plain = instance.get({ plain: true });
  return Object.fromEntries(fields.map((field) => [field, plain[field]]));
}

exports.applyToJob = async (req, res, next) => {
  try {
    const jobId = parsePositiveInteger(req.params.jobId, "jobId");
    const body = pickAllowedFields(req.body, ["cvId", "coverLetter"]);
    const cvId = parsePositiveInteger(body.cvId, "cvId");
    if (body.coverLetter != null && (typeof body.coverLetter !== "string" || body.coverLetter.length > 65535)) {
      throw new AppError(400, "INVALID_COVER_LETTER", "coverLetter phải là chuỗi.");
    }

    const transaction = await sequelize.transaction();
    try {
      // Khóa theo cùng thứ tự: tin -> hồ sơ -> CV.
      const job = await Job_post.findOne({
        where: { id: jobId, ...availableJobWhere() }, include: [companyInclude],
        transaction, lock: transaction.LOCK.UPDATE,
      });
      const profile = await getCandidateProfile(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
      const cv = await Cv_document.findOne({
        where: { id: cvId, candidate_id: req.user.id, archived_at: null },
        include: [{ model: Media_asset, as: "fileAsset", required: true,
          attributes: ["id", "original_name", "mime_type", "byte_size", "file_sha256"] }],
        transaction, lock: transaction.LOCK.UPDATE,
      });

      if (!job) {
        throw new AppError(404, "JOB_NOT_FOUND", "Việc làm không còn nhận hồ sơ.");
      }
      if (!cv) {
        throw new AppError(404, "CV_NOT_FOUND", "Không tìm thấy CV đang hoạt động của bạn.");
      }

      const jobSnapshot = snapshot(job, [
        "id",
        "company_id",
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
        "currency",
        "salary_period",
        "min_experience_months",
        "education_requirement",
        "revision",
        "company",
      ]);
      const jobSkills = await Job_skill.findAll({ where: { job_id: job.id },
        include: [{ model: Skill, as: "skill", attributes: ["id", "name"] }], transaction });
      jobSnapshot.skills = jobSkills.map(item => item.get({ plain: true }));
      const cvSnapshot = {
        id: cv.id,
        file_asset_id: cv.file_asset_id,
        raw_text: cv.raw_text,
        name: cv.name,
        processing_status: cv.processing_status,
        extraction_version: cv.extraction_version,
        parsed_data: cv.parsed_data,
        file: cv.fileAsset?.get({ plain: true }) || null,
      };
      const profileSnapshot = snapshot(profile, [
        "user_id",
        "full_name",
        "phone",
        "headline",
        "summary",
        "avatar_asset_id",
        "location_id",
        "desired_location_id",
        "desired_industry_id",
        "desired_employment_type_id",
        "desired_work_mode",
        "desired_salary_min",
        "profile_version",
      ]);

      profileSnapshot.educations = await Candidate_education.findAll({ where: { candidate_id: req.user.id }, transaction, raw: true });
      profileSnapshot.experiences = await Candidate_experience.findAll({ where: { candidate_id: req.user.id }, transaction, raw: true });
      profileSnapshot.projects = await Candidate_project.findAll({ where: { candidate_id: req.user.id }, transaction, raw: true });
      profileSnapshot.certifications = await Candidate_certification.findAll({ where: { candidate_id: req.user.id }, transaction, raw: true });
      profileSnapshot.skills = await Candidate_skill.findAll({ where: { candidate_id: req.user.id },
        include: [{ model: Skill, as: "skill", attributes: ["id", "name"] }], transaction, raw: true, nest: true });
      profileSnapshot.email = req.user.email;

      // Lưu tên danh mục cùng ID để đơn giữ được nội dung khi danh mục thay đổi.
      const locations = await Location.findAll({ where: { id: [job.location_id, profile.location_id, profile.desired_location_id].filter((id) => id != null) },
        attributes: ["id", "name"], transaction, raw: true });
      const industries = await Industry.findAll({ where: { id: [job.industry_id, profile.desired_industry_id].filter((id) => id != null) },
        attributes: ["id", "name"], transaction, raw: true });
      const employmentTypes = await Employment_type.findAll({ where: { id: [job.employment_type_id, profile.desired_employment_type_id].filter((id) => id != null) },
        attributes: ["id", "name"], transaction, raw: true });
      jobSnapshot.location = locations.find((item) => String(item.id) === String(job.location_id)) || null;
      jobSnapshot.industry = industries.find((item) => String(item.id) === String(job.industry_id)) || null;
      jobSnapshot.employmentType = employmentTypes.find((item) => String(item.id) === String(job.employment_type_id)) || null;
      jobSnapshot.level = await Job_level.findOne({ where: { id: job.level_id }, attributes: ["id", "name"], transaction, raw: true });
      profileSnapshot.location = locations.find((item) => String(item.id) === String(profile.location_id)) || null;
      profileSnapshot.desiredLocation = locations.find((item) => String(item.id) === String(profile.desired_location_id)) || null;
      profileSnapshot.desiredIndustry = industries.find((item) => String(item.id) === String(profile.desired_industry_id)) || null;
      profileSnapshot.desiredEmploymentType = employmentTypes.find((item) => String(item.id) === String(profile.desired_employment_type_id)) || null;

      const application = await Application.create(
        {
          job_id: job.id,
          candidate_id: req.user.id,
          cv_id: cv.id,
          cover_letter: body.coverLetter?.trim() || null,
          job_revision: job.revision,
          job_snapshot: jobSnapshot,
          cv_snapshot: cvSnapshot,
          profile_snapshot: profileSnapshot,
        },
        { transaction },
      );
      await Notification.create({ user_id: job.company.user_id, type: "NEW_APPLICATION",
        title: "Có hồ sơ ứng tuyển mới", body: "Vị trí " + job.title + " có hồ sơ ứng tuyển mới.",
        target_path: "/recruiter/applications/" + application.id,
      }, { transaction });
      await transaction.commit();
      return res.status(201).json({ message: "Ứng tuyển thành công.", data: application });
    } catch (error) {
      await transaction.rollback();
      if (error.name === "SequelizeUniqueConstraintError") {
        throw new AppError(409, "ALREADY_APPLIED", "Bạn đã ứng tuyển vị trí này rồi.");
      }
      throw error;
    }
  } catch (error) {
    return next(error);
  }
};

const applicationIncludes = [
  {
    model: Job_post,
    as: "job",
    attributes: ["id", "title", "company_id", "status", "location_id", "work_mode"],
    include: [
      { model: Company, as: "company", attributes: ["id", "name", "website"] },
      { model: Location, as: "location", attributes: ["id", "name"] },
    ],
  },
  {
    model: Cv_document,
    as: "cv",
    attributes: ["id", "name", "processing_status"],
  },
  {
    model: require("../../models/common/Interview").Interview,
    as: "interviews",
    attributes: [
      "id",
      "title",
      "starts_at",
      "ends_at",
      "timezone_name",
      "mode",
      "meeting_url",
      "location_text",
      "invitation_note",
      "status",
      "candidate_response",
      "responded_at",
    ],
  },
];

exports.listApplications = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, count } = await Application.findAndCountAll({
      where: { candidate_id: req.user.id },
      attributes: [
        "id",
        "job_id",
        "candidate_id",
        "cv_id",
        "cover_letter",
        "status",
        "job_revision",
        "submitted_at",
        "updated_at",
      ],
      include: applicationIncludes,
      distinct: true,
      order: [["submitted_at", "DESC"]],
      limit,
      offset,
    });
    return res.json(paginatedResponse(rows, count, page, limit));
  } catch (error) {
    return next(error);
  }
};

exports.getApplication = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.applicationId, "applicationId");
    const application = await Application.findOne({
      where: { id, candidate_id: req.user.id },
      attributes: [
        "id",
        "job_id",
        "candidate_id",
        "cv_id",
        "cover_letter",
        "job_snapshot", "cv_snapshot", "profile_snapshot",
        "status",
        "job_revision",
        "submitted_at",
        "updated_at",
      ],
      include: applicationIncludes,
    });
    if (!application) {
      throw new AppError(404, "APPLICATION_NOT_FOUND", "Không tìm thấy đơn ứng tuyển.");
    }
    return res.json({ data: application });
  } catch (error) {
    return next(error);
  }
};

exports.withdrawApplication = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.applicationId, "applicationId");
    await sequelize.transaction(async (transaction) => {
      const application = await Application.findOne({ where: { id, candidate_id: req.user.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!application) throw new AppError(404, "APPLICATION_NOT_FOUND", "Không tìm thấy đơn ứng tuyển.");
      if (!["SUBMITTED", "REVIEWING"].includes(application.status)) {
        throw new AppError(409, "APPLICATION_CANNOT_BE_WITHDRAWN", "Chỉ được rút đơn SUBMITTED hoặc REVIEWING.");
      }
      await application.update({ status: "WITHDRAWN" }, { transaction });
      await Interview.update({ status: "CANCELLED" }, { where: { application_id: id, status: "SCHEDULED", starts_at: { [Op.gt]: new Date() } }, transaction });
      const job = await Job_post.findByPk(application.job_id, { include: [{ model: Company, as: "company" }], transaction });
      if (job?.company) await Notification.create({ user_id: job.company.user_id, type: "APPLICATION_WITHDRAWN",
        title: "Ứng viên đã rút hồ sơ", body: "Một hồ sơ cho vị trí " + job.title + " đã được rút.",
        target_path: "/recruiter/applications/" + id,
      }, { transaction });
    });
    return res.status(200).json({ message: "Đã rút đơn ứng tuyển.", data: { id, status: "WITHDRAWN" } });
  } catch (error) {
    return next(error);
  }
};

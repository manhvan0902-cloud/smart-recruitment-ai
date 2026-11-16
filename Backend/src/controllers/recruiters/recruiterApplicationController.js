const {
  Company, sequelize, Application, Interview, Notification,
  Job_post, Cv_document, Media_asset,
} = require("../../models");
const { Op } = require("sequelize");
"use strict";

const { cloudinary, configureCloudinary } = require("../../configs/cloudinary");
const AppError = require("../../utils/AppError");

const validApplicationTransitions = {
  SUBMITTED: ["REVIEWING", "REJECTED"],
  REVIEWING: ["INTERVIEW", "REJECTED"],
  INTERVIEW: ["OFFERED", "REJECTED"],
  OFFERED: ["HIRED", "REJECTED"],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

async function findOwnedApplication(userId, applicationId, options = {}) {
  const company = await getCompany(userId);
  const { include = [], ...queryOptions } = options;
  const application = await Application.findOne({
    where: { id: applicationId },
    include: [
      {
        model: Job_post,
        as: "job",
        where: { company_id: company.id },
        attributes: ["id", "company_id", "title", "status"],
        required: true,
      },
      ...include,
    ],
    ...queryOptions,
  });
  if (!application) {
    throw new AppError(404, "APPLICATION_NOT_FOUND", "Không tìm thấy đơn ứng tuyển.");
  }
  return { company, application };
}

function assertBodyObject(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError(400, "INVALID_BODY", "Request body phải là object JSON.");
  }
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

exports.listApplications = async (req, res, next) => {
  try {
    const company = await getCompany(req.user.id);
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.status !== undefined) {
      const statuses = [
        "SUBMITTED",
        "REVIEWING",
        "INTERVIEW",
        "OFFERED",
        "HIRED",
        "REJECTED",
        "WITHDRAWN",
      ];
      if (!statuses.includes(req.query.status)) {
        throw new AppError(400, "INVALID_APPLICATION_STATUS", "status không hợp lệ.");
      }
      where.status = req.query.status;
    }
    const jobWhere = { company_id: company.id };
    const requestedJobId = req.params.jobId ?? req.query.jobId;
    if (requestedJobId !== undefined) {
      jobWhere.id = parsePositiveInteger(requestedJobId, "jobId");
    }
    const { rows, count } = await Application.findAndCountAll({
      where,
      attributes: ["id", "job_id", "candidate_id", "cv_id", "status", "submitted_at", "profile_snapshot"],
      include: [
        {
          model: Job_post,
          as: "job",
          where: jobWhere,
          attributes: ["id", "title", "status", "company_id"],
          required: true,
        },
  
      ],
      distinct: true,
      order: [["submitted_at", "DESC"], ["id", "DESC"]],
      limit,
      offset,
    });
    const data = rows.map(application => {
      const item = application.get({ plain: true });
      const profile = item.profile_snapshot || {};
      item.candidate = { user_id: item.candidate_id, full_name: profile.full_name, headline: profile.headline, email: profile.email };
      delete item.profile_snapshot;
      return item;
    });
    return res.status(200).json(paginatedResponse(data, count, page, limit));
  } catch (error) {
    return next(error);
  }
};

exports.getApplication = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.applicationId, "applicationId");
    const { application } = await findOwnedApplication(req.user.id, id, {
      attributes: [
        "id",
        "job_id",
        "candidate_id",
        "cv_id",
        "cover_letter",
        "status",
        "recruiter_note",
        "job_revision",
        "job_snapshot",
        "cv_snapshot",
        "profile_snapshot",
        "submitted_at",
        "updated_at",
      ],

    });
    const completedInterviewCount = await Interview.count({ where: { application_id: id, status: "COMPLETED" } });
    return res.json({ data: { ...application.get({ plain: true }), completed_interview_count: completedInterviewCount } });
  } catch (error) {
    return next(error);
  }
};

exports.updateApplicationStatus = async (req, res, next) => {
  try {
    assertBodyObject(req.body);
    const { status, recruiter_note: recruiterNote } = pickAllowedFields(
      req.body,
      ["status", "recruiter_note"],
    );
    const validStatuses = ["REVIEWING", "INTERVIEW", "OFFERED", "HIRED", "REJECTED"];
    if (status !== undefined && !validStatuses.includes(status)) {
      throw new AppError(
        400,
        "INVALID_APPLICATION_STATUS",
        "Trạng thái mới không hợp lệ.",
      );
    }
    if (
      recruiterNote !== undefined &&
      recruiterNote !== null &&
      (typeof recruiterNote !== "string" || recruiterNote.length > 65535)
    ) {
      throw new AppError(400, "INVALID_RECRUITER_NOTE", "Ghi chú nội bộ không hợp lệ.");
    }

    const id = parsePositiveInteger(req.params.applicationId, "applicationId");
    const transaction = await sequelize.transaction();
    try {
      const { application } = await findOwnedApplication(req.user.id, id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (
        status !== undefined &&
        !validApplicationTransitions[application.status]?.includes(status)
      ) {
        throw new AppError(
          409,
          "INVALID_STATUS_TRANSITION",
          `Không thể chuyển đơn từ ${application.status} sang ${status}.`,
        );
      }
      if (status === "OFFERED") {
        const completed = await Interview.count({ where: { application_id: id, status: "COMPLETED" }, transaction });
        if (!completed) throw new AppError(409, "INTERVIEW_NOT_COMPLETED", "Cần có ít nhất một lịch phỏng vấn hoàn tất trước khi gửi đề nghị.");
      }
      if (["HIRED", "REJECTED"].includes(status)) {
        await Interview.update({ status: "CANCELLED" }, { where: { application_id: id, status: "SCHEDULED", starts_at: { [Op.gt]: new Date() } }, transaction });
      }
      await application.update(
        {
          ...(status === undefined ? {} : { status }),
          ...(recruiterNote === undefined ? {} : { recruiter_note: recruiterNote }),
        },
        { transaction },
      );
      const noteTitles = {
        REVIEWING: "Đơn ứng tuyển đang được xem xét",
        INTERVIEW: "Cập nhật trạng thái ứng tuyển",
        OFFERED: "Bạn nhận được lời mời làm việc",
        HIRED: "Chúc mừng bạn đã được tuyển dụng",
        REJECTED: "Cập nhật kết quả ứng tuyển",
      };
      const noteBodies = {
        REVIEWING: "Nhà tuyển dụng đang xem xét hồ sơ ứng tuyển của bạn.",
        INTERVIEW: "Nhà tuyển dụng đã chuyển hồ sơ của bạn sang vòng phỏng vấn.",
        OFFERED: "Nhà tuyển dụng đã gửi lời mời làm việc cho bạn.",
        HIRED: "Nhà tuyển dụng đã cập nhật kết quả tuyển dụng.",
        REJECTED: "Nhà tuyển dụng đã cập nhật kết quả ứng tuyển.",
      };
      if (status !== undefined) {
        await Notification.create(
          {
            user_id: application.candidate_id,
            type: `APPLICATION_${status}`,
            title: noteTitles[status],
            body: noteBodies[status],
            target_path: `/applications/${application.id}`,
          },
          { transaction },
        );
      }
      await transaction.commit();
      return res.json({
        message: status === undefined
          ? "Đã cập nhật ghi chú nội bộ."
          : "Đã cập nhật trạng thái đơn ứng tuyển.",
        data: { id: application.id, status: application.status },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    return next(error);
  }
};

exports.getApplicationCvDownload = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.applicationId, "applicationId");
    const { application } = await findOwnedApplication(req.user.id, id, {
      include: [
        {
          model: Cv_document,
          as: "cv",
          required: true,
          include: [{ model: Media_asset, as: "fileAsset", required: true }],
        },
      ],
    });
    configureCloudinary();
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const downloadUrl = cloudinary.utils.private_download_url(
      application.cv.fileAsset.public_id,
      "",
      {
        expires_at: expiresAt,
        resource_type: "raw",
        type: "authenticated",
      },
    );
    return res.json({ data: { downloadUrl, expiresAt } });
  } catch (error) {
    return next(error);
  }
};


const {
  sequelize, Interview, Application, Job_post, Company,
  Notification,
} = require("../../models");
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

exports.listInterviews = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.status !== undefined) {
      if (!["SCHEDULED", "COMPLETED", "CANCELLED"].includes(req.query.status)) {
        throw new AppError(400, "INVALID_INTERVIEW_STATUS", "status không hợp lệ.");
      }
      where.status = req.query.status;
    }
    const applicationWhere = { candidate_id: req.user.id };
    if (req.query.applicationId !== undefined) {
      applicationWhere.id = parsePositiveInteger(req.query.applicationId, "applicationId");
    }
    const { rows, count } = await Interview.findAndCountAll({
      where,
      include: [
        {
          model: Application,
          as: "application",
          where: applicationWhere,
          attributes: ["id", "job_id", "status"],
          required: true,
          include: [{ association: "job", attributes: ["id", "title"],
            include: [{ model: Company, as: "company", attributes: ["id", "name"] }] }],
        },
      ],
      distinct: true,
      order: [["starts_at", "ASC"], ["id", "ASC"]],
      limit,
      offset,
    });
    return res.json(paginatedResponse(rows, count, page, limit));
  } catch (error) {
    return next(error);
  }
};

exports.respondToInterview = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.interviewId, "interviewId");
    const { response } = pickAllowedFields(req.body, ["response"]);
    if (!["ACCEPTED", "DECLINED"].includes(response)) throw new AppError(400, "INVALID_INTERVIEW_RESPONSE", "response phải là ACCEPTED hoặc DECLINED.");
    await sequelize.transaction(async (transaction) => {
      const reference = await Interview.findByPk(id, { attributes: ["application_id"], transaction });
      if (!reference) throw new AppError(404, "INTERVIEW_NOT_FOUND", "Không tìm thấy lịch phỏng vấn.");
      const application = await Application.findOne({ where: { id: reference.application_id, candidate_id: req.user.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!application) throw new AppError(404, "INTERVIEW_NOT_FOUND", "Không tìm thấy lịch phỏng vấn.");
      const interview = await Interview.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!interview) throw new AppError(404, "INTERVIEW_NOT_FOUND", "Không tìm thấy lịch phỏng vấn.");
      if (interview.status !== "SCHEDULED" || interview.candidate_response !== "PENDING" || new Date(interview.starts_at) <= new Date() || application.status !== "INTERVIEW") {
        throw new AppError(409, "INTERVIEW_NOT_RESPONDABLE", "Lịch đã được phản hồi, đã bắt đầu hoặc không còn hiệu lực.");
      }
      await interview.update({ candidate_response: response, responded_at: new Date() }, { transaction });
      const job = await Job_post.findByPk(application.job_id, { include: [{ model: Company, as: "company" }], transaction });
      if (job?.company) await Notification.create({ user_id: job.company.user_id, type: "INTERVIEW_RESPONSE",
        title: "Ứng viên đã phản hồi lịch phỏng vấn", body: "Ứng viên đã " + (response === "ACCEPTED" ? "chấp nhận" : "từ chối") + " lịch phỏng vấn.",
        target_path: "/recruiter/applications/" + application.id,
      }, { transaction });
    });
    return res.status(200).json({ message: "Đã gửi phản hồi lịch phỏng vấn.", data: { id, response } });
  } catch (error) {
    return next(error);
  }
};

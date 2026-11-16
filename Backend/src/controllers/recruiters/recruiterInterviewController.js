const {
  Company, sequelize, Application, Interview, Notification,
  Job_post,
} = require("../../models");
const AppError = require("../../utils/AppError");
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

const interviewFields = [
  "title",
  "starts_at",
  "ends_at",
  "timezone_name",
  "mode",
  "meeting_url",
  "location_text",
  "invitation_note",
];

function validateInterviewData(data, existing = {}) {
  const values = { ...existing, ...data };
  if (
    Object.hasOwn(data, "title") &&
    (typeof data.title !== "string" || !data.title.trim() || data.title.length > 200)
  ) {
    throw new AppError(400, "INVALID_INTERVIEW_TITLE", "title là bắt buộc và tối đa 200 ký tự.");
  }
  for (const field of ["meeting_url", "location_text", "invitation_note"]) {
    const maxLength = field === "meeting_url" ? 1000 : field === "location_text" ? 500 : 65535;
    if (
      Object.hasOwn(data, field) &&
      data[field] !== null &&
      (typeof data[field] !== "string" || data[field].length > maxLength)
    ) {
      throw new AppError(400, "INVALID_INTERVIEW_FIELD", `${field} không hợp lệ.`);
    }
  }
  if (
    Object.hasOwn(data, "timezone_name") &&
    (typeof data.timezone_name !== "string" || data.timezone_name.length > 64)
  ) {
    throw new AppError(400, "INVALID_TIMEZONE", "timezone_name không hợp lệ.");
  }
  if (values.timezone_name) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: values.timezone_name });
    } catch (error) {
      if (error instanceof RangeError) {
        throw new AppError(400, "INVALID_TIMEZONE", "timezone_name không phải múi giờ hợp lệ.");
      }
      throw error;
    }
  }
  for (const field of ["starts_at", "ends_at"]) {
    if (Object.hasOwn(data, field)) {
      if (
        typeof data[field] !== "string" ||
        !/(?:Z|[+-]\d{2}:\d{2})$/i.test(data[field]) ||
        Number.isNaN(new Date(data[field]).getTime())
      ) {
        throw new AppError(
          400,
          "INVALID_INTERVIEW_TIME",
          `${field} phải là ngày ISO 8601 có múi giờ.`,
        );
      }
      values[field] = new Date(data[field]);
    } else if (values[field]) {
      values[field] = new Date(values[field]);
    }
  }
  if (values.starts_at && values.ends_at && values.ends_at <= values.starts_at) {
    throw new AppError(400, "INVALID_INTERVIEW_TIME", "ends_at phải sau starts_at.");
  }
  if (
    Object.hasOwn(data, "mode") &&
    !["ONLINE", "OFFLINE"].includes(data.mode)
  ) {
    throw new AppError(400, "INVALID_INTERVIEW_MODE", "mode phải là ONLINE hoặc OFFLINE.");
  }
  if (values.mode === "ONLINE") {
    let url;
    try {
      url = new URL(values.meeting_url);
    } catch {
      throw new AppError(400, "MEETING_URL_REQUIRED", "Phỏng vấn trực tuyến cần meeting_url hợp lệ.");
    }
    if (url.protocol !== "https:") {
      throw new AppError(400, "INVALID_MEETING_URL", "meeting_url phải sử dụng HTTPS.");
    }
  }
  if (values.mode === "OFFLINE" && !values.location_text?.trim()) {
    throw new AppError(400, "INTERVIEW_LOCATION_REQUIRED", "Phỏng vấn trực tiếp cần location_text.");
  }
}

async function findOwnedInterview(userId, interviewId, options = {}) {
  const company = await getCompany(userId);
  const reference = await Interview.findByPk(interviewId, {
    attributes: ["application_id"], transaction: options.transaction,
  });
  if (!reference) throw new AppError(404, "INTERVIEW_NOT_FOUND", "Không tìm thấy lịch phỏng vấn.");
  // Các thao tác lịch và trạng thái đều khóa hồ sơ trước, rồi mới khóa lịch.
  const application = await Application.findOne({
    where: { id: reference.application_id },
    include: [{ model: Job_post, as: "job", where: { company_id: company.id },
      attributes: ["id", "company_id", "title"], required: true }],
    transaction: options.transaction, lock: options.lock,
  });
  if (!application) throw new AppError(404, "INTERVIEW_NOT_FOUND", "Không tìm thấy lịch phỏng vấn.");
  const interview = await Interview.findByPk(interviewId, options);
  if (!interview) throw new AppError(404, "INTERVIEW_NOT_FOUND", "Không tìm thấy lịch phỏng vấn.");
  interview.application = application;
  return interview;
}

function notificationText(jobTitle, startsAt) {
  return {
    title: "Lịch phỏng vấn đã được cập nhật",
    body: `Nhà tuyển dụng đã lên lịch phỏng vấn cho vị trí ${jobTitle} vào ${new Date(startsAt).toISOString()}.`,
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

async function getCompany(userId, options = {}) {
  const company = await Company.findOne({ where: { user_id: userId }, ...options });
  if (!company) {
    throw new AppError(404, "COMPANY_PROFILE_NOT_FOUND", "Chưa tìm thấy hồ sơ công ty.");
  }
  return company;
}

exports.listInterviews = async (req, res, next) => {
  try {
    const company = await getCompany(req.user.id);
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.status !== undefined) {
      if (!["SCHEDULED", "COMPLETED", "CANCELLED"].includes(req.query.status)) {
        throw new AppError(400, "INVALID_INTERVIEW_STATUS", "status không hợp lệ.");
      }
      where.status = req.query.status;
    }
    const applicationWhere = {};
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
          attributes: ["id", "candidate_id", "status", "profile_snapshot"],
          required: true,
          include: [
            {
              model: Job_post,
              as: "job",
              where: { company_id: company.id },
              attributes: ["id", "title"],
              required: true,
            },
          ],
        },
      ],
      distinct: true,
      order: [["starts_at", "ASC"], ["id", "ASC"]],
      limit,
      offset,
    });
    const data = rows.map((interview) => {
      const item = interview.get({ plain: true });
      const profile = item.application.profile_snapshot || {};
      item.application.candidate = { full_name: profile.full_name, email: profile.email };
      delete item.application.profile_snapshot;
      return item;
    });
    return res.json(paginatedResponse(data, count, page, limit));
  } catch (error) {
    return next(error);
  }
};

exports.createInterview = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const id = parsePositiveInteger(applicationId, "applicationId");
    const data = pickAllowedFields(req.body, interviewFields);
    for (const field of ["title", "starts_at", "ends_at", "mode"]) {
      if (!Object.hasOwn(data, field)) {
        throw new AppError(400, "MISSING_INTERVIEW_FIELD", `${field} là bắt buộc.`);
      }
    }
    const normalized = {
      ...data,
      timezone_name: data.timezone_name ?? "Asia/Ho_Chi_Minh",
      meeting_url: data.meeting_url ?? null,
      location_text: data.location_text ?? null,
      invitation_note: data.invitation_note ?? null,
    };
    validateInterviewData(normalized);
    if (new Date(normalized.starts_at) <= new Date()) {
      throw new AppError(400, "INTERVIEW_MUST_BE_FUTURE", "starts_at phải ở tương lai.");
    }
    const transaction = await sequelize.transaction();
    try {
      const { application } = await findOwnedApplication(req.user.id, id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!["REVIEWING", "INTERVIEW"].includes(application.status)) {
        throw new AppError(
          409,
          "APPLICATION_NOT_INTERVIEWABLE",
          "Chỉ đơn đang xem xét hoặc ở vòng phỏng vấn mới có thể lên lịch.",
        );
      }
      const interview = await Interview.create(
        { ...normalized, application_id: application.id },
        { transaction },
      );
      if (application.status === "REVIEWING") {
        await application.update({ status: "INTERVIEW" }, { transaction });
      }
      const notification = notificationText(application.job.title, normalized.starts_at);
      await Notification.create(
        {
          user_id: application.candidate_id,
          type: "INTERVIEW_SCHEDULED",
          title: notification.title,
          body: notification.body,
          target_path: `/applications/${application.id}`,
        },
        { transaction },
      );
      await transaction.commit();
      return res.status(201).json({ message: "Đã lên lịch phỏng vấn.", data: interview });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    return next(error);
  }
};

exports.updateInterview = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.interviewId, "interviewId");
    const data = pickAllowedFields(req.body, interviewFields);
    const transaction = await sequelize.transaction();
    try {
      const interview = await findOwnedInterview(req.user.id, id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (interview.status !== "SCHEDULED") {
        throw new AppError(409, "INTERVIEW_NOT_EDITABLE", "Chỉ lịch phỏng vấn sắp diễn ra mới chỉnh sửa được.");
      }
      if (!["REVIEWING", "INTERVIEW"].includes(interview.application.status)) throw new AppError(409, "APPLICATION_CLOSED", "Hồ sơ không còn ở vòng phỏng vấn.");
      validateInterviewData(data, interview.get({ plain: true }));
      const startsAt = data.starts_at ? new Date(data.starts_at) : interview.starts_at;
      if (startsAt <= new Date()) {
        throw new AppError(400, "INTERVIEW_MUST_BE_FUTURE", "starts_at phải ở tương lai.");
      }
      const needsResponse = ["starts_at", "ends_at", "mode", "meeting_url", "location_text"].some(field => {
        if (!Object.hasOwn(data, field)) return false;
        if (["starts_at", "ends_at"].includes(field)) return new Date(data[field]).getTime() !== new Date(interview[field]).getTime();
        return data[field] !== interview[field];
      });
      await interview.update(
        {
          ...data,
          ...(Object.hasOwn(data, "starts_at") ? { starts_at: startsAt } : {}),
          ...(Object.hasOwn(data, "ends_at") ? { ends_at: new Date(data.ends_at) } : {}),
          ...(needsResponse ? { candidate_response: "PENDING", responded_at: null } : {}),
        },
        { transaction },
      );
      const notification = notificationText(interview.application.job.title, interview.starts_at);
      await Notification.create(
        {
          user_id: interview.application.candidate_id,
          type: "INTERVIEW_UPDATED",
          title: notification.title,
          body: notification.body,
          target_path: `/applications/${interview.application.id}`,
        },
        { transaction },
      );
      await transaction.commit();
      return res.json({ message: "Đã cập nhật lịch phỏng vấn.", data: interview });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    return next(error);
  }
};

exports.cancelInterview = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.interviewId, "interviewId");
    const transaction = await sequelize.transaction();
    try {
      const interview = await findOwnedInterview(req.user.id, id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (interview.status !== "SCHEDULED") {
        throw new AppError(409, "INTERVIEW_NOT_CANCELLABLE", "Lịch phỏng vấn không còn hiệu lực.");
      }
      await interview.update({ status: "CANCELLED" }, { transaction });
      await Notification.create(
        {
          user_id: interview.application.candidate_id,
          type: "INTERVIEW_CANCELLED",
          title: "Lịch phỏng vấn đã bị hủy",
          body: `Lịch phỏng vấn cho vị trí ${interview.application.job.title} đã bị nhà tuyển dụng hủy.`,
          target_path: `/applications/${interview.application.id}`,
        },
        { transaction },
      );
      await transaction.commit();
      return res.json({ message: "Đã hủy lịch phỏng vấn.", data: { id, status: "CANCELLED" } });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    return next(error);
  }
};

exports.completeInterview = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.interviewId, "interviewId");
    await sequelize.transaction(async (transaction) => {
      const interview = await findOwnedInterview(req.user.id, id, { transaction, lock: transaction.LOCK.UPDATE });
      if (interview.status !== "SCHEDULED" || interview.candidate_response !== "ACCEPTED") throw new AppError(409, "INTERVIEW_NOT_COMPLETABLE", "Chỉ hoàn tất lịch đã được ứng viên chấp nhận.");
      if (new Date(interview.ends_at) > new Date()) throw new AppError(409, "INTERVIEW_NOT_ENDED", "Phỏng vấn chưa đến giờ kết thúc.");
      if (interview.application.status !== "INTERVIEW") throw new AppError(409, "APPLICATION_CLOSED", "Hồ sơ không còn ở vòng phỏng vấn.");
      await interview.update({ status: "COMPLETED" }, { transaction });
    });
    return res.status(200).json({ message: "Đã hoàn tất phỏng vấn.", data: { id, status: "COMPLETED" } });
  } catch (error) {
    return next(error);
  }
};

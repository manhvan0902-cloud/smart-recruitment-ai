const {
  Company, User, Industry, Location, Notification, sequelize,
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

exports.listCompanies = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.status !== undefined) {
      if (!["PENDING", "VERIFIED", "REJECTED"].includes(req.query.status)) throw new AppError(400, "INVALID_STATUS", "Trạng thái xác minh không hợp lệ.");
      where.verification_status = req.query.status;
    }
    const { rows, count } = await Company.findAndCountAll({ where,
      include: [
        { model: User, as: "user", attributes: ["id", "email", "status"] },
        { model: Industry, as: "industry", attributes: ["id", "name"] },
        { model: Location, as: "location", attributes: ["id", "name"] },
      ],
      order: [["id", "DESC"]], limit, offset,
    });
    return res.status(200).json(paginatedResponse(rows, count, page, limit));
  } catch (error) {
    return next(error);
  }
};

exports.verifyCompany = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.companyId, "companyId");
    const { status, note } = pickAllowedFields(req.body, ["status", "note"]);
    if (!["VERIFIED", "REJECTED"].includes(status)) throw new AppError(400, "INVALID_STATUS", "status phải là VERIFIED hoặc REJECTED.");
    if (note != null && (typeof note !== "string" || note.length > 1000)) throw new AppError(400, "INVALID_NOTE", "Ghi chú tối đa 1000 ký tự.");
    if (status === "REJECTED" && !note?.trim()) throw new AppError(400, "REASON_REQUIRED", "Cần nhập lý do từ chối.");
    const company = await sequelize.transaction(async (transaction) => {
      const record = await Company.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!record) throw new AppError(404, "COMPANY_NOT_FOUND", "Không tìm thấy công ty.");
      await record.update({ verification_status: status, verification_note: note?.trim() || null,
        verified_at: status === "VERIFIED" ? new Date() : null,
      }, { transaction });
      await Notification.create({ user_id: record.user_id, type: "COMPANY_" + status,
        title: status === "VERIFIED" ? "Công ty đã được xác minh" : "Hồ sơ công ty cần bổ sung",
        body: note?.trim() || "Bạn có thể đăng tin tuyển dụng.", target_path: "/recruiter/profile",
      }, { transaction });
      return record;
    });
    return res.status(200).json({ message: "Đã cập nhật xác minh công ty.", data: company });
  } catch (error) {
    return next(error);
  }
};

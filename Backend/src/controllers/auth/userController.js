const { User } = require("../../models");
const { Op } = require("sequelize");
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

exports.getUsersInfo = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.role !== undefined) {
      if (!["CANDIDATE", "COMPANY", "ADMIN"].includes(req.query.role)) throw new AppError(400, "INVALID_ROLE", "Vai trò không hợp lệ.");
      where.role = req.query.role;
    }
    if (req.query.q !== undefined) {
      if (typeof req.query.q !== "string" || req.query.q.length > 120) throw new AppError(400, "INVALID_SEARCH", "Từ khóa tối đa 120 ký tự.");
      where.email = { [Op.like]: "%" + req.query.q.trim() + "%" };
    }
    const { rows, count } = await User.findAndCountAll({ where,
      attributes: ["id", "email", "username", "role", "status", "created_at"], order: [["id", "DESC"]], limit, offset,
    });
    return res.status(200).json(paginatedResponse(rows, count, page, limit));
  } catch (error) {
    return next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.userId, "userId");
    const { status } = pickAllowedFields(req.body, ["status"]);
    if (!["ACTIVE", "LOCKED"].includes(status)) throw new AppError(400, "INVALID_STATUS", "status phải là ACTIVE hoặc LOCKED.");
    if (String(id) === String(req.user.id)) throw new AppError(409, "CANNOT_LOCK_SELF", "Không thay đổi trạng thái tài khoản đang quản trị.");
    const user = await User.findByPk(id);
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "Không tìm thấy tài khoản.");
    await user.update({ status });
    return res.status(200).json({ message: "Đã cập nhật trạng thái tài khoản.", data: { id: user.id, status: user.status } });
  } catch (error) {
    return next(error);
  }
};

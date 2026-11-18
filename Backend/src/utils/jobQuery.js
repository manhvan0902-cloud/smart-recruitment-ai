const { Op } = require("sequelize");
const AppError = require("./AppError");

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

function availableJobWhere() {
  return {
    status: "PUBLISHED",
    is_hidden: false,
    application_deadline: { [Op.gt]: new Date() },
  };
}

function buildJobWhere(query) {
  const where = availableJobWhere();
  const filters = [
    ["industryId", "industry_id"],
    ["locationId", "location_id"],
    ["levelId", "level_id"],
    ["employmentTypeId", "employment_type_id"],
  ];
  for (const [parameter, field] of filters) {
    if (query[parameter] !== undefined) where[field] = parsePositiveInteger(query[parameter], parameter);
  }
  if (query.workMode) {
    if (!["ONSITE", "HYBRID", "REMOTE"].includes(query.workMode)) {
      throw new AppError(400, "INVALID_WORK_MODE", "workMode không hợp lệ.");
    }
    where.work_mode = query.workMode;
  }
  if (query.q !== undefined) {
    if (typeof query.q !== "string" || query.q.trim().length > 120) {
      throw new AppError(400, "INVALID_SEARCH", "Từ khóa tìm kiếm tối đa 120 ký tự.");
    }
    const term = `%${query.q.trim()}%`;
    where[Op.and] = [{
      [Op.or]: [
        { title: { [Op.like]: term } },
        { description: { [Op.like]: term } },
        { requirements: { [Op.like]: term } },
      ],
    }];
  }
  return where;
}

module.exports = { availableJobWhere, buildJobWhere, parsePositiveInteger, parsePagination, paginatedResponse };

const { Candidate_education, Candidate_profile, sequelize } = require("../../models");
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

function validateData(data, creating, current = {}) {
  const values = { ...current, ...data };
  for (const field of ["school_name"]) {
    if ((creating || Object.hasOwn(data, field)) && (typeof values[field] !== "string" || !values[field].trim())) {
      throw new AppError(400, "MISSING_FIELD", field + " là bắt buộc.");
    }
  }
  const limits = {"school_name":200,"major":150,"degree":100,"description":65535};
  for (const [field, max] of Object.entries(limits)) {
    if (data[field] != null && (typeof data[field] !== "string" || data[field].length > max)) {
      throw new AppError(400, "INVALID_FIELD", field + " không hợp lệ.");
    }
  }
  for (const field of ["start_date","end_date"]) {
    if (data[field] != null && (typeof data[field] !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data[field]) || Number.isNaN(Date.parse(data[field])) || new Date(data[field]).toISOString().slice(0, 10) !== data[field])) {
      throw new AppError(400, "INVALID_DATE", field + " phải là ngày hợp lệ YYYY-MM-DD.");
    }
  }
  if (values.start_date && values.end_date && values.end_date < values.start_date) {
    throw new AppError(400, "INVALID_DATE_RANGE", "Ngày kết thúc phải từ ngày bắt đầu trở đi.");
  }
  for (const field of ["project_url", "credential_url"]) {
    if (data[field] != null) {
      let url;
      try { url = new URL(data[field]); } catch { throw new AppError(400, "INVALID_URL", field + " không hợp lệ."); }
      if (!["http:", "https:"].includes(url.protocol)) throw new AppError(400, "INVALID_URL", field + " phải dùng HTTP hoặc HTTPS.");
    }
  }
}

exports.listEducations = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, count } = await Candidate_education.findAndCountAll({
      where: { candidate_id: req.user.id }, order: [["id", "DESC"]], limit, offset,
    });
    return res.status(200).json({ data: rows, pagination: { page, limit, total: count } });
  } catch (error) {
    return next(error);
  }
};

exports.createEducation = async (req, res, next) => {
  try {
    const data = pickAllowedFields(req.body, ["school_name","major","degree","description","start_date","end_date"]);
    validateData(data, true);
    const row = await sequelize.transaction(async (transaction) => {
      const profile = await Candidate_profile.findByPk(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!profile) throw new AppError(404, "PROFILE_NOT_FOUND", "Chưa tạo hồ sơ ứng viên.");
      const record = await Candidate_education.create({ ...data, candidate_id: req.user.id }, { transaction });
      await profile.update({ profile_version: Number(profile.profile_version) + 1 }, { transaction });
      return record;
    });
    return res.status(201).json({ message: "Đã thêm dữ liệu.", data: row });
  } catch (error) {
    return next(error);
  }
};

exports.updateEducation = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.id, "id");
    const data = pickAllowedFields(req.body, ["school_name","major","degree","description","start_date","end_date"]);
    const row = await sequelize.transaction(async (transaction) => {
      const profile = await Candidate_profile.findByPk(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!profile) throw new AppError(404, "PROFILE_NOT_FOUND", "Chưa tạo hồ sơ ứng viên.");
      const record = await Candidate_education.findOne({ where: { id, candidate_id: req.user.id }, transaction });
      if (!record) throw new AppError(404, "RECORD_NOT_FOUND", "Không tìm thấy dữ liệu.");
      validateData(data, false, record.get({ plain: true }));
      await record.update(data, { transaction });
      await profile.update({ profile_version: Number(profile.profile_version) + 1 }, { transaction });
      return record;
    });
    return res.status(200).json({ message: "Đã cập nhật dữ liệu.", data: row });
  } catch (error) {
    return next(error);
  }
};

exports.deleteEducation = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.id, "id");
    await sequelize.transaction(async (transaction) => {
      const profile = await Candidate_profile.findByPk(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!profile) throw new AppError(404, "PROFILE_NOT_FOUND", "Chưa tạo hồ sơ ứng viên.");
      const count = await Candidate_education.destroy({ where: { id, candidate_id: req.user.id }, transaction });
      if (!count) throw new AppError(404, "RECORD_NOT_FOUND", "Không tìm thấy dữ liệu.");
      await profile.update({ profile_version: Number(profile.profile_version) + 1 }, { transaction });
    });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
};

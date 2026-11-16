const {
  Candidate_profile, Media_asset, Location, Industry, Employment_type,
  sequelize,
} = require("../../models");
const AppError = require("../../utils/AppError");

// Chỉ lấy những trường ứng viên được phép sửa.
async function readProfileData(body, userId) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError(400, "INVALID_BODY", "Body phải là một object JSON.");
  }
  const data = {};
  const fields = ["full_name", "phone", "headline", "summary", "avatar_asset_id", "location_id",
    "desired_location_id", "desired_industry_id", "desired_employment_type_id", "desired_work_mode", "desired_salary_min"];
  for (const field of fields) {
    if (Object.hasOwn(body, field)) data[field] = body[field];
  }
  const limits = { full_name: 150, phone: 30, headline: 200, summary: 65535 };
  for (const [field, max] of Object.entries(limits)) {
    if (data[field] != null && (typeof data[field] !== "string" || data[field].length > max)) {
      throw new AppError(400, "INVALID_FIELD", field + " không hợp lệ.");
    }
  }
  if (Object.hasOwn(data, "full_name")) {
    if (typeof data.full_name !== "string" || !data.full_name.trim()) {
      throw new AppError(400, "INVALID_NAME", "Họ tên không được để trống.");
    }
    data.full_name = data.full_name.trim();
  }
  if (data.desired_work_mode != null && !["ONSITE", "HYBRID", "REMOTE"].includes(data.desired_work_mode)) {
    throw new AppError(400, "INVALID_WORK_MODE", "Hình thức làm việc không hợp lệ.");
  }
  if (data.desired_salary_min != null &&
      ((typeof data.desired_salary_min !== "string" && typeof data.desired_salary_min !== "number") ||
       !/^\d{1,13}(?:\.\d{1,2})?$/.test(String(data.desired_salary_min)))) {
    throw new AppError(400, "INVALID_SALARY", "Lương phải là số không âm, tối đa 2 chữ số thập phân.");
  }
  for (const [field, Model] of [["location_id", Location], ["desired_location_id", Location],
    ["desired_industry_id", Industry], ["desired_employment_type_id", Employment_type]]) {
    if (data[field] != null) {
      if ((typeof data[field] !== "string" && typeof data[field] !== "number") ||
          !/^[1-9]\d*$/.test(String(data[field])) || !Number.isSafeInteger(Number(data[field]))) {
        throw new AppError(400, "INVALID_REFERENCE", field + " không hợp lệ.");
      }
      const item = await Model.findOne({ where: { id: data[field], is_active: true } });
      if (!item) throw new AppError(400, "INVALID_REFERENCE", field + " không tồn tại hoặc đã bị tắt.");
    }
  }
  if (data.avatar_asset_id != null) {
    if ((typeof data.avatar_asset_id !== "string" && typeof data.avatar_asset_id !== "number") ||
        !/^[1-9]\d*$/.test(String(data.avatar_asset_id)) || !Number.isSafeInteger(Number(data.avatar_asset_id))) {
      throw new AppError(400, "INVALID_AVATAR", "ID ảnh đại diện không hợp lệ.");
    }
    const avatar = await Media_asset.findOne({ where: {
      id: data.avatar_asset_id, owner_user_id: userId, purpose: "AVATAR", resource_type: "image",
    } });
    if (!avatar) throw new AppError(400, "INVALID_AVATAR", "Ảnh đại diện không thuộc tài khoản của bạn.");
  }
  return data;
}

exports.getCandidateProfile = async (req, res, next) => {
  try {
    const profile = await Candidate_profile.findByPk(req.user.id, { include: [
      { model: Location, as: "location", attributes: ["id", "name"] },
      { model: Location, as: "desiredLocation", attributes: ["id", "name"] },
      { model: Industry, as: "desiredIndustry", attributes: ["id", "name"] },
      { model: Employment_type, as: "desiredEmploymentType", attributes: ["id", "name"] },
    ] });
    if (!profile) return next(new AppError(404, "PROFILE_NOT_FOUND", "Không tìm thấy hồ sơ ứng viên."));
    return res.status(200).json({ data: profile });
  } catch (error) {
    return next(error);
  }
};

exports.createCandidateProfile = async (req, res, next) => {
  try {
    const data = await readProfileData(req.body, req.user.id);
    if (!data.full_name) return next(new AppError(400, "INVALID_NAME", "Họ tên là bắt buộc."));
    const [profile, created] = await Candidate_profile.findOrCreate({
      where: { user_id: req.user.id }, defaults: { ...data, user_id: req.user.id },
    });
    if (!created) return next(new AppError(409, "PROFILE_EXISTS", "Hồ sơ ứng viên đã tồn tại."));
    return res.status(201).json({ message: "Đã tạo hồ sơ ứng viên.", data: profile });
  } catch (error) {
    return next(error);
  }
};

exports.updateCandidateProfile = async (req, res, next) => {
  try {
    const data = await readProfileData(req.body, req.user.id);
    const profile = await sequelize.transaction(async (transaction) => {
      const record = await Candidate_profile.findByPk(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!record) throw new AppError(404, "PROFILE_NOT_FOUND", "Không tìm thấy hồ sơ ứng viên.");
      await record.update({ ...data, profile_version: Number(record.profile_version) + 1 }, { transaction });
      return record;
    });
    return res.status(200).json({ message: "Đã cập nhật hồ sơ ứng viên.", data: profile });
  } catch (error) {
    return next(error);
  }
};

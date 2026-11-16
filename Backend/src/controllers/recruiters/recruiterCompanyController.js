const {
  sequelize, Company, Industry, Location, Media_asset,
  Skill, Job_level, Employment_type,
} = require("../../models");
const cloudinary = require("cloudinary").v2;
const AppError = require("../../utils/AppError");

const companyFields = [
  "name",
  "description",
  "industry_id",
  "location_id",
  "address",
  "website",
  "contact_email",
  "company_size",
];

const companyIncludes = [
  { model: Industry, as: "industry", attributes: ["id", "name"] },
  { model: Location, as: "location", attributes: ["id", "name"] },
  {
    model: Media_asset,
    as: "logo",
    attributes: ["id", "public_id", "version", "original_name", "mime_type", "byte_size", "created_at"],
  },
];

function companyData(company) {
  const data = company.get({ plain: true });
  if (data.logo) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      throw new AppError(
        503,
        "CLOUDINARY_NOT_CONFIGURED",
        "CLOUDINARY_CLOUD_NAME cần được cấu hình để hiển thị logo.",
      );
    }
    data.logo.url = cloudinary.url(data.logo.public_id, {
      cloud_name: cloudName,
      version: data.logo.version,
      resource_type: "image",
      type: "upload",
      format: data.logo.mime_type === "image/jpeg"
        ? "jpg"
        : data.logo.mime_type.split("/")[1],
      secure: true,
    });
    delete data.logo.public_id;
    delete data.logo.version;
  }
  return data;
}

async function validateCompanyData(data) {
  validateStringFields(data, {
    name: 200,
    description: 65535,
    address: 300,
    website: 500,
    contact_email: 254,
    company_size: 50,
  });
  if (Object.hasOwn(data, "name") && !data.name?.trim()) {
    throw new AppError(400, "INVALID_COMPANY_NAME", "Tên công ty không được để trống.");
  }
  if (
    Object.hasOwn(data, "contact_email") &&
    data.contact_email !== null &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_email)
  ) {
    throw new AppError(400, "INVALID_CONTACT_EMAIL", "Email liên hệ không hợp lệ.");
  }
  await validateCompanyRefs(data);
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

function pickAllowedFields(body, fields) {
  assertObjectBody(body);
  const data = {};
  for (const field of fields) {
    if (Object.hasOwn(body, field)) data[field] = body[field];
  }
  return data;
}

async function getCompany(userId, options = {}) {
  const company = await Company.findOne({ where: { user_id: userId }, ...options });
  if (!company) {
    throw new AppError(404, "COMPANY_PROFILE_NOT_FOUND", "Chưa tìm thấy hồ sơ công ty.");
  }
  return company;
}

async function validateCompanyRefs(data) {
  for (const [field, Model] of [
    ["industry_id", Industry],
    ["location_id", Location],
  ]) {
    if (Object.hasOwn(data, field) && data[field] !== null) {
      const id = parsePositiveInteger(data[field], field);
      if (!(await Model.findOne({ where: { id, is_active: true } }))) {
        throw new AppError(400, "INVALID_COMPANY_REFERENCE", `${field} không hợp lệ.`);
      }
      data[field] = id;
    }
  }
}

function validateStringFields(data, limits) {
  for (const [field, maxLength] of Object.entries(limits)) {
    if (
      Object.hasOwn(data, field) &&
      data[field] !== null &&
      (typeof data[field] !== "string" || data[field].length > maxLength)
    ) {
      throw new AppError(400, "INVALID_FIELD", `${field} không hợp lệ.`);
    }
  }
}

exports.getProfile = async (req, res, next) => {
  try {
    const company = await getCompany(req.user.id, { include: companyIncludes });
    return res.json({ data: companyData(company) });
  } catch (error) {
    return next(error);
  }
};

exports.createProfile = async (req, res, next) => {
  try {
    const data = pickAllowedFields(req.body, companyFields);
    if (typeof data.name !== "string" || !data.name.trim()) {
      throw new AppError(400, "INVALID_COMPANY_NAME", "Tên công ty là bắt buộc.");
    }
    await validateCompanyData(data);
    const [company, created] = await Company.findOrCreate({
      where: { user_id: req.user.id },
      defaults: { ...data, user_id: req.user.id },
    });
    if (!created) {
      throw new AppError(409, "COMPANY_PROFILE_EXISTS", "Hồ sơ công ty đã tồn tại.");
    }
    await company.reload({ include: companyIncludes });
    return res.status(201).json({ data: companyData(company) });
  } catch (error) {
    return next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const data = pickAllowedFields(req.body, companyFields);
    await validateCompanyData(data);
    const company = await sequelize.transaction(async (transaction) => {
      const company = await getCompany(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
      const identityChanged = data.name !== undefined && data.name.trim() !== company.name;
      if (typeof data.name === "string") data.name = data.name.trim();
      if (identityChanged) {
        data.verification_status = "PENDING";
        data.verified_at = null;
        data.verification_note = null;
      }
      await company.update(data, { transaction });
      return company;
    });
    await company.reload({ include: companyIncludes });
    return res.json({ message: "Cập nhật hồ sơ công ty thành công.", data: companyData(company) });
  } catch (error) {
    return next(error);
  }
};

exports.catalog = async (req, res, next) => {
  try {
    const data = {};
    for (const [name, Model] of Object.entries({
      industries: Industry,
      locations: Location,
      skills: Skill,
      jobLevels: Job_level,
      employmentTypes: Employment_type,
    })) {
      data[name] = await Model.findAll({
        where: { is_active: true },
        attributes: ["id", "name"],
        order: [["name", "ASC"]],
      });
    }
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
};


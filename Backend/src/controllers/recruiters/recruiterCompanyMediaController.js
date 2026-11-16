const { sequelize, Company, Media_asset } = require("../../models");
const crypto = require("node:crypto");
const { Readable } = require("node:stream");
const { cloudinary, configureCloudinary } = require("../../configs/cloudinary");
const multer = require("multer");
const AppError = require("../../utils/AppError");

const maxLogoSizeBytes = 5 * 1024 * 1024;
const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxLogoSizeBytes, files: 1 },
  fileFilter(req, file, callback) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return callback(new AppError(400, "INVALID_LOGO_FILE", "Chỉ chấp nhận JPEG, PNG hoặc WebP."));
    }
    return callback(null, true);
  },
});

function verifyImage(file) {
  const buffer = file.buffer;
  const signatures = {
    "image/jpeg": buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    "image/png": buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/webp":
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP",
  };
  if (!signatures[file.mimetype]) {
    throw new AppError(400, "INVALID_LOGO_FILE", "Nội dung tệp không khớp định dạng ảnh.");
  }
}

function uploadToCloudinary(file, companyId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        type: "upload",
        folder: "smart-recruitment/company-logos",
        public_id: `${companyId}/${crypto.randomUUID()}`,
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      },
    );
    const source = Readable.from(file.buffer);
    source.on("error", reject);
    stream.on("error", reject);
    source.pipe(stream);
  });
}

async function getCompany(userId, options = {}) {
  const company = await Company.findOne({ where: { user_id: userId }, ...options });
  if (!company) {
    throw new AppError(404, "COMPANY_PROFILE_NOT_FOUND", "Chưa tìm thấy hồ sơ công ty.");
  }
  return company;
}

exports.uploadMiddleware = uploadLogo.single("file");

exports.uploadLogo = async (req, res, next) => {
  let uploaded;
  let saved = false;
  try {
    if (!req.file) return next(new AppError(400, "LOGO_FILE_REQUIRED", "Hãy gửi ảnh trong multipart field file."));
    verifyImage(req.file);
    const company = await getCompany(req.user.id);
    configureCloudinary();
    uploaded = await uploadToCloudinary(req.file, company.id);
    if (!uploaded?.asset_id || !uploaded.public_id || !uploaded.version) {
      throw new AppError(502, "LOGO_UPLOAD_FAILED", "Kho tệp trả về metadata không đầy đủ.");
    }
    const result = await sequelize.transaction(async (transaction) => {
      const record = await getCompany(req.user.id, { transaction, lock: transaction.LOCK.UPDATE,
        include: [{ model: Media_asset, as: "logo" }] });
      const oldLogo = record.logo;
      const asset = await Media_asset.create({ owner_user_id: req.user.id, purpose: "LOGO",
        cloudinary_asset_id: uploaded.asset_id, public_id: uploaded.public_id, resource_type: "image", delivery_type: "upload",
        version: uploaded.version, original_name: req.file.originalname.slice(0, 255), mime_type: req.file.mimetype,
        byte_size: req.file.size, file_sha256: crypto.createHash("sha256").update(req.file.buffer).digest("hex"),
      }, { transaction });
      await record.update({ logo_asset_id: asset.id }, { transaction });
      return { asset, oldLogo };
    });
    saved = true;
    if (result.oldLogo) {
      try {
        await cloudinary.uploader.destroy(result.oldLogo.public_id, { resource_type: "image", type: "upload", invalidate: true });
        await result.oldLogo.destroy();
      } catch (error) { console.error("Chưa xóa được logo cũ:", error.message); }
    }
    return res.status(200).json({ message: "Đã cập nhật logo công ty.", data: { id: result.asset.id, url: uploaded.secure_url } });
  } catch (error) {
    if (uploaded?.public_id && !saved) {
      try { await cloudinary.uploader.destroy(uploaded.public_id, { resource_type: "image", type: "upload", invalidate: true }); }
      catch (cleanupError) { console.error("Chưa xóa được logo sau lỗi DB:", cleanupError.message); }
    }
    return next(error);
  }
};

exports.deleteLogo = async (req, res, next) => {
  try {
    configureCloudinary();
    const asset = await sequelize.transaction(async (transaction) => {
      const company = await getCompany(req.user.id, { transaction, lock: transaction.LOCK.UPDATE, include: [{ model: Media_asset, as: "logo" }] });
      if (!company.logo) throw new AppError(404, "COMPANY_LOGO_NOT_FOUND", "Công ty chưa có logo.");
      const oldLogo = company.logo;
      await company.update({ logo_asset_id: null }, { transaction });
      return oldLogo;
    });
    try {
      await cloudinary.uploader.destroy(asset.public_id, { resource_type: "image", type: "upload", invalidate: true });
      await asset.destroy();
    } catch (error) {
      console.error("Chưa xóa được tệp logo:", error.message);
      return next(new AppError(502, "LOGO_CLEANUP_FAILED", "Đã gỡ logo khỏi hồ sơ nhưng chưa xóa được tệp trên Cloudinary."));
    }
    return res.status(200).json({ message: "Đã xóa logo công ty." });
  } catch (error) {
    return next(error);
  }
};

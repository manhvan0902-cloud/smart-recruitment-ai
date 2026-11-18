const {
  sequelize, Candidate_profile, Cv_document, Media_asset, Ai_task,
} = require("../../models");
const crypto = require("node:crypto");
const path = require("node:path");
const { Readable } = require("node:stream");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const { cloudinary, configureCloudinary } = require("../../configs/cloudinary");
const AppError = require("../../utils/AppError");

const maxCvSizeBytes = 10 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxCvSizeBytes, files: 1 },
  fileFilter(req, file, callback) {
    if (file.mimetype !== "application/pdf" || path.extname(file.originalname).toLowerCase() !== ".pdf") {
      return callback(new AppError(400, "INVALID_CV_FILE", "Chỉ chấp nhận tệp PDF."));
    }
    return callback(null, true);
  },
});
exports.uploadMiddleware = upload.single("file");

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

function publicCv(cv) {
  const data = cv.get({ plain: true });
  delete data.raw_text;
  delete data.parsed_data;
  return data;
}

function uploadFile(file, userId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: "raw", type: "authenticated", overwrite: false,
      folder: "smart-recruitment/cvs",
      public_id: userId + "/" + crypto.randomUUID() + ".pdf",
    }, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
    const source = Readable.from(file.buffer);
    source.on("error", reject);
    stream.on("error", reject);
    source.pipe(stream);
  });
}

exports.uploadCv = async (req, res, next) => {
  let uploaded;
  let saved = false;
  try {
    if (!req.file) return next(new AppError(400, "CV_FILE_REQUIRED", "Hãy gửi CV trong multipart field file."));
    if (req.file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return next(new AppError(400, "INVALID_CV_FILE", "Nội dung tệp không phải PDF."));
    }
    const name = req.body?.name ?? path.parse(req.file.originalname).name;
    if (typeof name !== "string" || !name.trim() || name.trim().length > 200) {
      return next(new AppError(400, "INVALID_CV_NAME", "Tên CV từ 1 đến 200 ký tự."));
    }
    const profile = await Candidate_profile.findByPk(req.user.id);
    if (!profile) return next(new AppError(404, "PROFILE_NOT_FOUND", "Chưa tạo hồ sơ ứng viên."));
    configureCloudinary();
    uploaded = await uploadFile(req.file, req.user.id);
    if (!uploaded?.asset_id || !uploaded.public_id || !uploaded.version) {
      throw new AppError(502, "CV_UPLOAD_FAILED", "Kho tệp trả về metadata không đầy đủ.");
    }
    const cv = await sequelize.transaction(async (transaction) => {
      const asset = await Media_asset.create({
        owner_user_id: req.user.id, purpose: "CV", cloudinary_asset_id: uploaded.asset_id,
        public_id: uploaded.public_id, resource_type: "raw", delivery_type: "authenticated",
        version: uploaded.version, original_name: req.file.originalname.slice(0, 255),
        mime_type: "application/pdf", byte_size: req.file.size,
        file_sha256: crypto.createHash("sha256").update(req.file.buffer).digest("hex"),
      }, { transaction });
      return Cv_document.create({
        candidate_id: req.user.id, file_asset_id: asset.id, name: name.trim(), processing_status: "UPLOADED",
      }, { transaction });
    });
    saved = true;
    return res.status(201).json({ message: "Đã tải CV lên.", data: publicCv(cv) });
  } catch (error) {
    if (uploaded?.public_id && !saved) {
      try {
        await cloudinary.uploader.destroy(uploaded.public_id, { resource_type: "raw", type: "authenticated" });
      } catch (cleanupError) { console.error("Không xóa được CV sau lỗi DB:", cleanupError.message); }
    }
    return next(error);
  }
};

exports.listCvs = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, count } = await Cv_document.findAndCountAll({
      where: { candidate_id: req.user.id, archived_at: null },
      attributes: { exclude: ["raw_text", "parsed_data"] },
      include: [{ model: Media_asset, as: "fileAsset", attributes: ["id", "original_name", "mime_type", "byte_size"] }],
      order: [["created_at", "DESC"], ["id", "DESC"]], limit, offset,
    });
    return res.status(200).json(paginatedResponse(rows, count, page, limit));
  } catch (error) {
    return next(error);
  }
};

exports.getCv = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.cvId, "cvId");
    const cv = await Cv_document.findOne({ where: { id, candidate_id: req.user.id },
      include: [{ model: Media_asset, as: "fileAsset", attributes: ["id", "original_name", "mime_type", "byte_size"] }],
    });
    if (!cv) return next(new AppError(404, "CV_NOT_FOUND", "Không tìm thấy CV."));
    return res.status(200).json({ data: publicCv(cv), parsedData: cv.parsed_data, rawText: cv.raw_text });
  } catch (error) {
    return next(error);
  }
};

exports.archiveCv = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.cvId, "cvId");
    await sequelize.transaction(async (transaction) => {
      const cv = await Cv_document.findOne({ where: { id, candidate_id: req.user.id, archived_at: null }, transaction, lock: transaction.LOCK.UPDATE });
      if (!cv) throw new AppError(404, "CV_NOT_FOUND", "Không tìm thấy CV đang hoạt động.");
      if (cv.processing_status === "PROCESSING") throw new AppError(409, "CV_BUSY", "CV đang được xử lý.");
      await cv.update({ archived_at: new Date() }, { transaction });
    });
    return res.status(200).json({ message: "Đã lưu trữ CV." });
  } catch (error) {
    return next(error);
  }
};

exports.downloadCv = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.cvId, "cvId");
    const cv = await Cv_document.findOne({ where: { id, candidate_id: req.user.id, archived_at: null },
      include: [{ model: Media_asset, as: "fileAsset", required: true }],
    });
    if (!cv) return next(new AppError(404, "CV_NOT_FOUND", "Không tìm thấy CV."));
    configureCloudinary();
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const downloadUrl = cloudinary.utils.private_download_url(cv.fileAsset.public_id, "", {
      expires_at: expiresAt, resource_type: "raw", type: "authenticated",
    });
    return res.status(200).json({ data: { downloadUrl, expiresAt } });
  } catch (error) {
    return next(error);
  }
};

exports.parseCv = async (req, res, next) => {
  let cv;
  let processing = false;
  try {
    const id = parsePositiveInteger(req.params.cvId, "cvId");
    configureCloudinary();
    cv = await Cv_document.findOne({ where: { id, candidate_id: req.user.id, archived_at: null },
      include: [{ model: Media_asset, as: "fileAsset", required: true }],
    });
    if (!cv) return next(new AppError(404, "CV_NOT_FOUND", "Không tìm thấy CV."));
    if (Number(cv.fileAsset.byte_size) > maxCvSizeBytes) throw new AppError(413, "CV_TOO_LARGE", "CV vượt quá 10 MB.");
    const [count] = await Cv_document.update({ processing_status: "PROCESSING", error_message: null }, {
      where: { id, candidate_id: req.user.id, archived_at: null, processing_status: ["UPLOADED", "READY", "FAILED"] },
    });
    if (!count) return next(new AppError(409, "CV_BUSY", "CV đang được xử lý."));
    processing = true;
    const url = cloudinary.utils.private_download_url(cv.fileAsset.public_id, "", {
      expires_at: Math.floor(Date.now() / 1000) + 60, resource_type: "raw", type: "authenticated",
    });
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.body) throw new AppError(502, "CV_DOWNLOAD_FAILED", "Không tải được CV từ kho tệp.");
    // Đọc từng phần và dừng ngay khi quá giới hạn, không giữ toàn bộ tệp quá lớn trong RAM.
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > maxCvSizeBytes) throw new AppError(413, "CV_TOO_LARGE", "CV vượt quá 10 MB.");
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new AppError(422, "CV_PARSE_FAILED", "Nội dung tệp không phải PDF.");
    const parser = new PDFParse({ data: bytes });
    let text;
    try {
      const info = await parser.getInfo();
      if (info.total > 100) throw new AppError(422, "CV_TOO_MANY_PAGES", "Chỉ xử lý CV tối đa 100 trang.");
      const parsed = await parser.getText({ pageJoiner: "", lineEnforce: true });
      text = parsed.text.trim();
    } finally { await parser.destroy(); }
    if (!text) throw new AppError(422, "CV_HAS_NO_TEXT", "PDF không có văn bản. Hãy dùng CV có lớp văn bản.");
    if (text.length > 1000000) throw new AppError(422, "CV_TEXT_TOO_LONG", "Văn bản CV vượt quá giới hạn xử lý.");
    await cv.update({ raw_text: text,
      parsed_data: { extraction_method: "pdf-text", extracted_characters: text.length },
      extraction_version: Number(cv.extraction_version) + 1, processing_status: "READY",
      error_message: null, parsed_at: new Date(),
    });
    return res.status(200).json({ message: "Đã trích xuất văn bản PDF; đây chưa phải phân tích AI.",
      data: { cvId: cv.id, processingStatus: cv.processing_status, extractionVersion: cv.extraction_version, text },
    });
  } catch (error) {
    if (processing) {
      try { await cv.update({ processing_status: "FAILED", error_message: "Không thể trích xuất văn bản từ CV. Hãy kiểm tra tệp hoặc thử lại." }); }
      catch (updateError) { console.error("Không cập nhật được trạng thái CV:", updateError.message); }
    }
    if (error.name === "TimeoutError") return next(new AppError(504, "CV_TIMEOUT", "Tải CV quá thời gian cho phép."));
    if (processing && !error.status) return next(new AppError(422, "CV_PARSE_FAILED", "Không thể xử lý PDF. Hãy kiểm tra tệp hoặc thử lại."));
    return next(error);
  }
};

exports.listCvTasks = async (req, res, next) => {
  try {
    const cvId = parsePositiveInteger(req.params.cvId, "cvId");
    const cv = await Cv_document.findOne({ where: { id: cvId, candidate_id: req.user.id } });
    if (!cv) return next(new AppError(404, "CV_NOT_FOUND", "Không tìm thấy CV."));
    const { page, limit, offset } = parsePagination(req.query);
    const where = { cv_id: cvId, requested_by: req.user.id };
    if (req.query.feature !== undefined) {
      if (!["PARSE_CV", "MATCH_CV"].includes(req.query.feature)) throw new AppError(400, "INVALID_AI_FEATURE", "Loại tác vụ AI không hợp lệ.");
      where.feature = req.query.feature;
    }
    const { rows, count } = await Ai_task.findAndCountAll({ where,
      attributes: { exclude: ["input_snapshot", "input_hash"] }, order: [["id", "DESC"]], limit, offset,
    });
    return res.status(200).json(paginatedResponse(rows, count, page, limit));
  } catch (error) {
    return next(error);
  }
};

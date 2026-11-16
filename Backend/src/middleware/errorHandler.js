function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const isSequelizeValidationError =
    error.name === "SequelizeValidationError" ||
    error.name === "SequelizeForeignKeyConstraintError";
  const isUniqueConstraintError = error.name === "SequelizeUniqueConstraintError";
  const isMulterError = error.name === "MulterError";
  const databaseInputErrorCodes = new Set([
    "ER_DATA_TOO_LONG",
    "ER_TRUNCATED_WRONG_VALUE",
    "ER_WARN_DATA_OUT_OF_RANGE",
    "ER_BAD_NULL_ERROR",
    "ER_NO_REFERENCED_ROW_2",
    "ER_CHECK_CONSTRAINT_VIOLATED",
    "ER_CONSTRAINT_FAILED",
  ]);
  const isDatabaseInputError =
    error.name === "SequelizeDatabaseError" &&
    (databaseInputErrorCodes.has(error.original?.code || error.parent?.code) ||
      error.original?.errno === 4025 || error.parent?.errno === 4025);
  let status = error.status;
  if (!Number.isInteger(status) || status < 400 || status > 599) {
    if (isUniqueConstraintError) status = 409;
    else if (isSequelizeValidationError || isDatabaseInputError) status = 400;
    else if (isMulterError) status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    else status = 500;
  }

  let code = error.code || "REQUEST_ERROR";
  let message = error.message;
  if (status >= 500 && error.name !== "AppError") {
    code = "INTERNAL_SERVER_ERROR";
    message = "Đã xảy ra lỗi máy chủ.";
  } else if (isUniqueConstraintError) {
    code = error.code || "DUPLICATE_VALUE";
    message = "Dữ liệu đã tồn tại.";
  } else if (isSequelizeValidationError) {
    code = error.code || "INVALID_DATA";
    message = "Dữ liệu gửi lên không hợp lệ.";
  } else if (isDatabaseInputError) {
    code = error.code || "INVALID_DATA";
    message = "Dữ liệu gửi lên không phù hợp với cấu trúc dữ liệu.";
  } else if (isMulterError) {
    code = error.code || "INVALID_UPLOAD";
    message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Tệp tải lên vượt quá giới hạn cho phép (CV 10 MB, logo 5 MB)."
        : "Yêu cầu tải tệp lên không hợp lệ.";
  }

  if (status >= 500) {
    console.error(
      "API error:",
      error.original?.code || error.code || error.name,
    );
  }

  return res.status(status).json({
    error: { code, message, ...(error.fields ? { fields: error.fields } : {}) },
  });
}

module.exports = errorHandler;

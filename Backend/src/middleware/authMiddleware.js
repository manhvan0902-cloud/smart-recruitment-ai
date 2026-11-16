"use strict";

const jwt = require("jsonwebtoken");
const { User } = require("../models/auth/User.js");
const AppError = require("../utils/AppError");
const { getPasswordVersion } = require("../utils/password");

const authMiddleware = async (req, res, next) => {
  const authorization = req.get("authorization");
  const tokenMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) {
    return next(new AppError(401, "AUTHENTICATION_REQUIRED", "Vui lòng đăng nhập."));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new Error("JWT_SECRET chưa được cấu hình."));
  }

  let decoded;
  try {
    decoded = jwt.verify(tokenMatch[1], secret, { algorithms: ["HS256"] });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, "INVALID_TOKEN", "Token không hợp lệ hoặc đã hết hạn."));
    }
    return next(error);
  }

  if (!decoded || typeof decoded !== "object" || !decoded.userId) {
    return next(new AppError(401, "INVALID_TOKEN", "Token không hợp lệ."));
  }

  const user = await User.findByPk(decoded.userId);
  if (!user || user.status !== "ACTIVE") {
    return next(new AppError(401, "INVALID_ACCOUNT", "Tài khoản không tồn tại hoặc đã bị khóa."));
  }
  if (decoded.passwordVersion !== getPasswordVersion(user.password_hash)) {
    return next(new AppError(401, "INVALID_TOKEN", "Mật khẩu đã thay đổi. Vui lòng đăng nhập lại."));
  }

  req.user = user;
  return next();
};

const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, "AUTHENTICATION_REQUIRED", "Vui lòng đăng nhập."));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này."));
    }
    return next();
  };
};

module.exports = {
  authMiddleware,
  roleMiddleware,
};

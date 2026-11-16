const jwt = require("jsonwebtoken");
const { User } = require("../../models/auth/User.js");
const { Candidate_profile } = require("../../models/candidates/Candidate_profile");
const { Company } = require("../../models/recruitments/Company");
const { sequelize } = require("../../configs/database");
const AppError = require("../../utils/AppError");
const { hashPassword, verifyPassword, getPasswordVersion } = require("../../utils/password");

exports.register = async (req, res, next) => {
  const { username, email, role = "CANDIDATE", password, full_name, company_name } = req.body || {};
  if (
    typeof email !== "string" ||
    email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" ||
    password.length < 8 || password.length > 128 ||
    !["CANDIDATE", "COMPANY"].includes(role)
  ) {
    return next(
      new AppError(
        400,
        "INVALID_REGISTRATION",
        "Email, mật khẩu tối thiểu 8 ký tự và vai trò CANDIDATE hoặc COMPANY là bắt buộc.",
      ),
    );
  }
  if (username !== undefined && (typeof username !== "string" || username.length > 50)) {
    return next(new AppError(400, "INVALID_USERNAME", "Username không hợp lệ."));
  }
  if (company_name !== undefined && (typeof company_name !== "string" || !company_name.trim() || company_name.length > 200)) {
    return next(new AppError(400, "INVALID_COMPANY_NAME", "Tên công ty từ 1 đến 200 ký tự."));
  }

  let transaction;
  try {
    const passwordHash = await hashPassword(password);
    transaction = await sequelize.transaction();
    const user = await User.create(
      {
        username: username?.trim() || null,
        email: email.trim().toLowerCase(),
        role,
        password_hash: passwordHash,
      },
      { transaction },
    );

    if (role === "CANDIDATE") {
      const candidateName =
        typeof full_name === "string" && full_name.trim()
          ? full_name.trim()
          : username?.trim() || email.split("@")[0];
      await Candidate_profile.create(
        { user_id: user.id, full_name: candidateName.slice(0, 150) },
        { transaction },
      );
    }
    if (role === "COMPANY") {
      await Company.create({
        user_id: user.id,
        name: company_name?.trim() || username?.trim() || email.trim().split("@")[0],
        verification_status: "PENDING",
      }, { transaction });
    }

    await transaction.commit();
    return res.status(201).json({
      message: "Đăng ký thành công.",
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    return next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string") {
      return next(new AppError(400, "INVALID_CREDENTIALS", "Email và mật khẩu là bắt buộc."));
    }
    const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });

    if (!user || user.status !== "ACTIVE" || !(await verifyPassword(password, user.password_hash))) {
      return next(new AppError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không chính xác."));
    }

    if (!process.env.JWT_SECRET) {
      return next(new Error("JWT_SECRET chưa được cấu hình."));
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, passwordVersion: getPasswordVersion(user.password_hash) },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h", algorithm: "HS256" },
    );

    return res.status(200).json({
      message: "Đăng nhập thành công.",
      data: { user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      }, token },
    });
  } catch (error) {
    return next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (
      typeof oldPassword !== "string" ||
      typeof newPassword !== "string" ||
      newPassword.length < 8 || newPassword.length > 128
    ) {
      return next(
        new AppError(400, "INVALID_PASSWORD", "Mật khẩu mới phải có ít nhất 8 ký tự."),
      );
    }
    if (!(await verifyPassword(oldPassword, req.user.password_hash))) {
      return next(new AppError(401, "INVALID_PASSWORD", "Mật khẩu hiện tại không chính xác."));
    }
    req.user.password_hash = await hashPassword(newPassword);
    await req.user.save({ fields: ["password_hash"] });
    return res.status(200).json({ message: "Đổi mật khẩu thành công." });
  } catch (error) {
    return next(error);
  }
};

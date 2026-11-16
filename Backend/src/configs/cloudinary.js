require("./environment");
const cloudinary = require("cloudinary").v2;
const AppError = require("../utils/AppError");

function configureCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new AppError(503, "CLOUDINARY_NOT_CONFIGURED", "Chưa cấu hình Cloudinary.");
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
    timeout: 15000,
  });
  return cloudinary;
}

module.exports = { cloudinary, configureCloudinary };

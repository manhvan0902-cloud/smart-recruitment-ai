const path = require("node:path");

// Luôn đọc Backend/.env, không phụ thuộc thư mục chạy lệnh.
require("dotenv").config({
  path: path.resolve(__dirname, "../..", ".env"),
  quiet: true,
});

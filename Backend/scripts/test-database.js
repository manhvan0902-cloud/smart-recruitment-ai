require("../src/configs/environment");
const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");

// Tạo DB riêng có tên ngẫu nhiên; tuyệt đối không nhập seed vào DB đang dùng.
async function run() {
  const database = "smart_recruitment_test_" + crypto.randomBytes(8).toString("hex");
  if (!/^smart_recruitment_test_[a-f0-9]{16}$/.test(database)) throw new Error("Tên DB kiểm thử không hợp lệ.");
  let connection;
  let created = false;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || "localhost",
      port: Number(process.env.MYSQL_PORT || 3307),
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      multipleStatements: true,
      connectTimeout: 5000,
    });
    await connection.query("CREATE DATABASE `" + database + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    created = true;
    let sql = fs.readFileSync(path.resolve(__dirname, "../../docs/database_tuyen_dung_final.sql"), "utf8");
    sql = sql.replace(/CREATE DATABASE IF NOT EXISTS smart_recruitment\s+CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;/, "");
    sql = sql.replace("USE smart_recruitment;", "USE `" + database + "`;");
    if (sql.includes("USE smart_recruitment;") || sql.includes("CREATE DATABASE IF NOT EXISTS smart_recruitment")) {
      throw new Error("Không thể tách schema sang DB kiểm thử.");
    }
    await connection.query(sql);
    const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "tests/database/recruitment.test.js"], {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, MYSQL_DATABASE: database, NODE_ENV: "test", JWT_SECRET: crypto.randomBytes(32).toString("hex") },
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    process.exitCode = result.status === 0 ? 0 : 1;
  } catch (error) {
    console.error("Kiểm thử DB thất bại:", error.code || error.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      // Chỉ xóa DB mà chính lần chạy này đã tạo thành công.
      if (created) await connection.query("DROP DATABASE `" + database + "`");
      await connection.end();
    }
  }
}

run().catch((error) => { console.error(error.message); process.exitCode = 1; });

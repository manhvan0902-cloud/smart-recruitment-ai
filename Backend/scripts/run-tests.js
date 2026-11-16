const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const group = process.argv[2];
if (!["unit", "integration"].includes(group)) throw new Error("Nhóm test không hợp lệ.");
const folder = path.resolve(__dirname, "../tests", group);
const files = fs.readdirSync(folder).filter((name) => name.endsWith(".test.js")).map((name) => path.join(folder, name));
if (!files.length) throw new Error("Không tìm thấy bài kiểm thử. Không được coi 0 test là thành công.");
const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", ...files], { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status === 0 ? 0 : 1;

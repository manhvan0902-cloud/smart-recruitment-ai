process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret-that-is-longer-than-32-characters";

const { test, before, after, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const { Writable } = require("node:stream");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const models = require("../../src/models");
const { cloudinary } = require("../../src/configs/cloudinary");
const { getPasswordVersion } = require("../../src/utils/password");

let server;
let baseUrl;
const candidate = { id: 25, role: "CANDIDATE", status: "ACTIVE", password_hash: "test-password-hash" };

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = "http://127.0.0.1:" + server.address().port;
});

afterEach(() => mock.restoreAll());
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await models.sequelize.close();
});

function token(user = candidate, extra = {}) {
  return jwt.sign({ userId: user.id, passwordVersion: getPasswordVersion(user.password_hash), ...extra }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
}

async function request(url, options = {}, user = candidate) {
  const headers = { Authorization: "Bearer " + token(user), ...options.headers };
  return fetch(baseUrl + url, { ...options, headers });
}

function authenticated(user = candidate) {
  mock.method(models.User, "findByPk", async () => user);
}

function configureStorage() {
  mock.method(cloudinary, "config", () => {});
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.CLOUDINARY_API_KEY = "test-key";
  process.env.CLOUDINARY_API_SECRET = "test-secret";
}

function fileForm(content = "%PDF-test-content", filename = "cv.pdf", type = "application/pdf") {
  const form = new FormData();
  form.append("file", new Blob([content], { type }), filename);
  return form;
}

test("health trả 200 khi DB kết nối được", async () => {
  mock.method(models.sequelize, "authenticate", async () => {});
  const res = await fetch(baseUrl + "/api/health");
  assert.equal(res.status, 200);
  assert.equal((await res.json()).database, "connected");
});

test("health trả 503 khi DB chưa sẵn sàng", async () => {
  mock.method(models.sequelize, "authenticate", async () => { throw new Error("internal connection detail"); });
  const res = await fetch(baseUrl + "/api/health");
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.error.code, "DATABASE_UNAVAILABLE");
  assert.equal(JSON.stringify(body).includes("internal connection detail"), false);
});

test("route riêng vẫn yêu cầu đăng nhập", async () => {
  for (const url of ["/api/candidate/profile", "/api/candidate/educations", "/api/candidate/cvs", "/api/recruiter/jobs", "/api/admin/users"]) {
    const res = await fetch(baseUrl + url);
    assert.equal(res.status, 401, url);
  }
});

test("ứng viên không mở được route công ty hoặc admin", async () => {
  authenticated();
  assert.equal((await request("/api/recruiter/profile")).status, 403);
  assert.equal((await request("/api/admin/users")).status, 403);
});

test("JWT từ trước khi đổi mật khẩu không được dùng tiếp", async () => {
  authenticated({ ...candidate, password_hash: "new-password-hash" });
  assert.equal((await request("/api/candidate/profile")).status, 401);
});

test("tài khoản LOCKED bị từ chối dù JWT còn hạn", async () => {
  authenticated({ ...candidate, status: "LOCKED" });
  assert.equal((await request("/api/candidate/profile")).status, 401);
});

test("một request profile chỉ xác thực một lần qua các router nhỏ", async () => {
  const lookup = mock.method(models.User, "findByPk", async () => candidate);
  mock.method(models.Candidate_profile, "findByPk", async (id) => ({ user_id: id, full_name: "Ứng viên" }));
  const res = await request("/api/candidate/profile");
  assert.equal(res.status, 200);
  assert.equal(lookup.mock.callCount(), 1);
  assert.equal((await res.json()).data.user_id, 25);
});

test("CV của người khác trả 404 và query luôn kèm owner", async () => {
  authenticated();
  mock.method(models.Cv_document, "findOne", async (query) => {
    assert.equal(query.where.id, 99);
    assert.equal(query.where.candidate_id, 25);
    return null;
  });
  const res = await request("/api/candidate/cvs/99");
  assert.equal(res.status, 404);
});

test("task được truy vấn theo tài khoản yêu cầu", async () => {
  authenticated();
  mock.method(models.Ai_task, "findOne", async (query) => {
    assert.deepEqual(query.where, { id: 12, requested_by: 25 });
    return null;
  });
  assert.equal((await request("/api/candidate/ai-tasks/12")).status, 404);
});

test("danh sách thông báo hoạt động ở route riêng và có scope user", async () => {
  authenticated();
  mock.method(models.Notification, "findAndCountAll", async (query) => {
    assert.equal(query.where.user_id, 25);
    return { rows: [], count: 0 };
  });
  mock.method(models.Notification, "count", async () => 0);
  const res = await request("/api/candidate/notifications");
  assert.equal(res.status, 200);
  assert.equal((await res.json()).unreadCount, 0);
});

test("admin lấy danh sách tài khoản không lấy password_hash", async () => {
  const admin = { ...candidate, id: 1, role: "ADMIN" };
  authenticated(admin);
  mock.method(models.User, "findAndCountAll", async (query) => {
    assert.equal(query.attributes.includes("password_hash"), false);
    return { rows: [], count: 0 };
  });
  assert.equal((await request("/api/admin/users", {}, admin)).status, 200);
});

test("multipart giả PDF bị chặn trước khi upload", async () => {
  authenticated();
  const upload = mock.method(cloudinary.uploader, "upload_stream", () => assert.fail("Không được upload tệp giả"));
  const res = await request("/api/candidate/cvs", { method: "POST", body: fileForm("not a PDF") });
  assert.equal(res.status, 400);
  assert.equal(upload.mock.callCount(), 0);
});

test("upload CV tạo media private và CV có đủ trường bắt buộc", async () => {
  authenticated();
  configureStorage();
  mock.method(models.Candidate_profile, "findByPk", async () => ({ user_id: 25 }));
  mock.method(cloudinary.uploader, "upload_stream", (options, callback) => {
    assert.equal(options.resource_type, "raw");
    assert.equal(options.type, "authenticated");
    assert.equal(options.overwrite, false);
    return new Writable({ write(chunk, encoding, done) { done(); }, final(done) { callback(null, { asset_id: "asset-1", public_id: "25/cv.pdf", version: 1 }); done(); } });
  });
  mock.method(models.sequelize, "transaction", async (callback) => callback({}));
  mock.method(models.Media_asset, "create", async (data) => {
    assert.equal(data.owner_user_id, 25);
    assert.equal(data.purpose, "CV");
    assert.equal(data.file_sha256.length, 64);
    return { id: 7 };
  });
  mock.method(models.Cv_document, "create", async (data) => {
    assert.equal(data.candidate_id, 25);
    assert.equal(data.file_asset_id, 7);
    assert.equal(data.name, "cv");
    assert.equal(data.processing_status, "UPLOADED");
    return { get() { return { id: 10, ...data }; } };
  });
  const res = await request("/api/candidate/cvs", { method: "POST", body: fileForm() });
  assert.equal(res.status, 201);
  assert.equal((await res.json()).data.id, 10);
});

test("mở transaction thất bại vẫn dọn CV vừa upload", async () => {
  authenticated();
  configureStorage();
  mock.method(models.Candidate_profile, "findByPk", async () => ({ user_id: 25 }));
  mock.method(cloudinary.uploader, "upload_stream", (options, callback) => new Writable({ write(chunk, encoding, done) { done(); }, final(done) { callback(null, { asset_id: "asset-1", public_id: "25/cv.pdf", version: 1 }); done(); } }));
  mock.method(models.sequelize, "transaction", async () => { throw new Error("internal DB failure"); });
  const cleanup = mock.method(cloudinary.uploader, "destroy", async (id, options) => {
    assert.equal(id, "25/cv.pdf");
    assert.equal(options.type, "authenticated");
  });
  const res = await request("/api/candidate/cvs", { method: "POST", body: fileForm() });
  assert.equal(res.status, 500);
  assert.equal(cleanup.mock.callCount(), 1);
  assert.equal(JSON.stringify(await res.json()).includes("internal DB failure"), false);
});

test("đối chiếu CV chưa trích xuất trả lỗi rõ ràng", async () => {
  authenticated();
  mock.method(models.Cv_document, "findOne", async () => ({ processing_status: "UPLOADED", raw_text: null }));
  const res = await request("/api/candidate/cvs/1/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, "CV_NOT_PARSED");
});

test("endpoint không tồn tại trả JSON 404", async () => {
  const res = await fetch(baseUrl + "/api/not-existing");
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, "NOT_FOUND");
});

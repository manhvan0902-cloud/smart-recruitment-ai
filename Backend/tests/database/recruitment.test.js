const { test, before, after, mock } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Writable } = require("node:stream");

// Chặn chạy nhầm file test này trên database của người dùng.
if (!/^smart_recruitment_test_[a-f0-9]{16}$/.test(process.env.MYSQL_DATABASE || "")) {
  throw new Error("Hãy dùng npm run test:database để tạo DB kiểm thử riêng.");
}

const app = require("../../src/app");
const models = require("../../src/models");
const { cloudinary } = require("../../src/configs/cloudinary");
let server;
let baseUrl;
let adminToken;
let companyToken;
let candidateToken;
let companyId;
let companyUserId;
let jobId;
let cvId;
let applicationId;
let interviewId;
let uploadNumber = 0;
const httpFetch = global.fetch;
const pdf = fs.readFileSync(path.resolve(__dirname, "../../../docs/TAI_LIEU_HE_THONG.pdf"));

before(async () => {
  await models.sequelize.authenticate();
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = "http://127.0.0.1:" + server.address().port;
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.CLOUDINARY_API_KEY = "test-key";
  process.env.CLOUDINARY_API_SECRET = "test-secret";
  mock.method(cloudinary.uploader, "upload_stream", (options, callback) => new Writable({
    write(chunk, encoding, done) { done(); },
    final(done) {
      uploadNumber++;
      callback(null, { asset_id: "test-asset-" + uploadNumber, public_id: "test/cv-" + uploadNumber + ".pdf", version: 1 });
      done();
    },
  }));
  // HTTP/API và SQL chạy thật; chỉ thay kho Cloudinary để không cần Internet/khóa thật.
  mock.method(global, "fetch", async (url, options) => {
    if (String(url).startsWith(baseUrl)) return httpFetch(url, options);
    return new Response(pdf, { status: 200 });
  });
});

after(async () => {
  mock.restoreAll();
  if (server) await new Promise((resolve) => server.close(resolve));
  await models.sequelize.close();
});

async function api(url, method = "GET", body, token) {
  const headers = {};
  if (token) headers.Authorization = "Bearer " + token;
  let payload = body;
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const response = await httpFetch(baseUrl + url, { method, body: payload, headers });
  const json = await response.json();
  return { status: response.status, body: json };
}

async function login(email, password = "TestPassword!2026") {
  const result = await api("/api/auth/login", "POST", { email, password });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body.data.token;
}

function cvForm() {
  const form = new FormData();
  form.append("file", new Blob([pdf], { type: "application/pdf" }), "cv.pdf");
  return form;
}

test("đăng nhập tài khoản seed và đăng ký mới trên DB thật", async () => {
  adminToken = await login("admin@demo.local", "DemoLocal!2026");
  let result = await api("/api/auth/register", "POST", { email: "candidate@test.local", password: "TestPassword!2026", full_name: "Ứng viên lúc nộp" });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  candidateToken = await login("candidate@test.local");
  result = await api("/api/auth/register", "POST", { email: "company@test.local", password: "TestPassword!2026", role: "COMPANY", company_name: "Công ty kiểm thử" });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  companyUserId = result.body.data.id;
  companyToken = await login("company@test.local");
  result = await api("/api/recruiter/profile", "GET", undefined, companyToken);
  assert.equal(result.status, 200);
  companyId = result.body.data.id;
  assert.equal(result.body.data.verification_status, "PENDING");
});

test("email trùng bị chặn và không tạo thêm hồ sơ", async () => {
  const before = await models.Candidate_profile.count();
  const result = await api("/api/auth/register", "POST", { email: "candidate@test.local", password: "TestPassword!2026" });
  assert.equal(result.status, 409);
  assert.equal(await models.Candidate_profile.count(), before);
});

test("admin xác minh công ty rồi đăng tin đủ điều kiện", async () => {
  let result = await api("/api/recruiter/jobs", "POST", { title: "Node.js Developer" }, companyToken);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  jobId = result.body.data.id;
  result = await api("/api/recruiter/jobs/" + jobId + "/publish", "POST", {}, companyToken);
  assert.equal(result.status, 403);
  result = await api("/api/admin/companies/" + companyId + "/verification", "PATCH", { status: "VERIFIED" }, adminToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  result = await api("/api/recruiter/jobs/" + jobId + "/publish", "POST", {}, companyToken);
  assert.equal(result.status, 422);
  assert.equal(result.body.data.status, "NEEDS_CHANGES");
  result = await api("/api/recruiter/jobs/" + jobId, "PATCH", {
    revision: result.body.data.revision, description: "Phát triển API", requirements: "Node.js và JavaScript",
    industry_id: 1, location_id: 1, level_id: 2, employment_type_id: 1, work_mode: "ONSITE",
    address: "Địa chỉ kiểm thử", application_deadline: "2035-01-01T00:00:00Z",
  }, companyToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  result = await api("/api/recruiter/jobs/" + jobId + "/skills", "PUT", {
    revision: result.body.data.revision, skills: [{ skillId: 1, isRequired: true, importance: 2 }, { skillId: 2, isRequired: true, importance: 3 }],
  }, companyToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  result = await api("/api/recruiter/jobs/" + jobId + "/publish", "POST", {}, companyToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  result = await api("/api/candidate/jobs/" + jobId, "GET", undefined, candidateToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
});

test("upload và parse PDF chạy thật với media private trong DB", async () => {
  let result = await api("/api/candidate/cvs", "POST", cvForm(), candidateToken);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  cvId = result.body.data.id;
  const media = await models.Media_asset.findByPk(result.body.data.file_asset_id);
  assert.equal(media.delivery_type, "authenticated");
  assert.equal(media.resource_type, "raw");
  result = await api("/api/candidate/cvs/" + cvId + "/parse", "POST", {}, candidateToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.ok(result.body.data.text.length > 100);
});

test("đối chiếu lưu kết quả quy tắc có bằng chứng và đọc lại được", async () => {
  let result = await api("/api/candidate/cvs/" + cvId + "/matches", "POST", { jobIds: [jobId] }, candidateToken);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  assert.equal(result.body.data[0].algorithm_version, "skill-overlap-v1");
  assert.ok(result.body.data[0].evidence.length > 0);
  result = await api("/api/candidate/cvs/" + cvId + "/matches", "GET", undefined, candidateToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.ok(result.body.pagination.total > 0);
});

test("ứng tuyển chụp đủ snapshot và chặn nộp trùng", async () => {
  let result = await api("/api/candidate/jobs/" + jobId + "/applications", "POST", { cvId }, candidateToken);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  applicationId = result.body.data.id;
  assert.equal(result.body.data.job_snapshot.skills.length, 2);
  assert.ok(result.body.data.cv_snapshot.file_asset_id);
  assert.ok(result.body.data.cv_snapshot.file.file_sha256);
  assert.equal(result.body.data.profile_snapshot.full_name, "Ứng viên lúc nộp");
  result = await api("/api/candidate/jobs/" + jobId + "/applications", "POST", { cvId }, candidateToken);
  assert.equal(result.status, 409, JSON.stringify(result.body));
});

test("nhà tuyển dụng đọc đúng snapshot sau khi hồ sơ cá nhân đổi", async () => {
  let result = await api("/api/candidate/profile", "PATCH", { full_name: "Tên thay sau khi nộp", desired_salary_min: 0, headline: null }, candidateToken);
  assert.equal(result.status, 200);
  result = await api("/api/recruiter/applications/" + applicationId, "GET", undefined, companyToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.data.profile_snapshot.full_name, "Ứng viên lúc nộp");
  assert.equal(result.body.data.candidate, undefined);
  result = await api("/api/recruiter/applications", "GET", undefined, companyToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.ok(result.body.data.some((item) => String(item.id) === String(applicationId)));
});

test("không dùng CV của người khác; hai request đồng thời chỉ tạo một đơn", async () => {
  const token = await login("ungvien2@demo.local", "DemoLocal!2026");
  let result = await api("/api/candidate/jobs/" + jobId + "/applications", "POST", { cvId }, token);
  assert.equal(result.status, 404);
  result = await api("/api/candidate/cvs", "POST", cvForm(), token);
  assert.equal(result.status, 201);
  const ownedCvId = result.body.data.id;
  const results = await Promise.all([
    api("/api/candidate/jobs/" + jobId + "/applications", "POST", { cvId: ownedCvId }, token),
    api("/api/candidate/jobs/" + jobId + "/applications", "POST", { cvId: ownedCvId }, token),
  ]);
  assert.deepEqual(results.map((item) => item.status).sort(), [201, 409]);
});

test("việc lưu nhiều kỹ năng vẫn có tổng số đúng", async () => {
  assert.equal((await api("/api/candidate/saved-jobs/" + jobId, "PUT", undefined, candidateToken)).status, 201);
  const result = await api("/api/candidate/saved-jobs", "GET", undefined, candidateToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.pagination.total, 1);
});

test("pipeline từ xem xét đến lịch, phản hồi, hoàn tất và tuyển dụng", async () => {
  let result = await api("/api/recruiter/applications/" + applicationId + "/status", "PATCH", { status: "REVIEWING" }, companyToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  result = await api("/api/recruiter/applications/" + applicationId + "/status", "PATCH", { status: "HIRED" }, companyToken);
  assert.equal(result.status, 409);
  result = await api("/api/recruiter/applications/" + applicationId + "/interviews", "POST", {
    title: "Vòng kỹ thuật", starts_at: "2030-01-01T01:00:00Z", ends_at: "2030-01-01T02:00:00Z",
    mode: "ONLINE", meeting_url: "https://example.com/meeting",
  }, companyToken);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  interviewId = result.body.data.id;
  result = await api("/api/candidate/interviews/" + interviewId + "/response", "PATCH", { response: "ACCEPTED" }, candidateToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  result = await api("/api/recruiter/interviews/" + interviewId, "PATCH", { invitation_note: "Bổ sung lời nhắn" }, companyToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.data.candidate_response, "ACCEPTED");
  result = await api("/api/recruiter/interviews/" + interviewId + "/complete", "PATCH", {}, companyToken);
  assert.equal(result.status, 409);
  // Chỉ thay thời gian trong DB kiểm thử, mô phỏng phỏng vấn đã kết thúc.
  await models.Interview.update({ starts_at: new Date(Date.now() - 7200000), ends_at: new Date(Date.now() - 3600000) }, { where: { id: interviewId } });
  result = await api("/api/recruiter/interviews/" + interviewId + "/complete", "PATCH", {}, companyToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  for (const status of ["OFFERED", "HIRED"]) {
    result = await api("/api/recruiter/applications/" + applicationId + "/status", "PATCH", { status }, companyToken);
    assert.equal(result.status, 200, JSON.stringify(result.body));
  }
});

test("đổi tên công ty về PENDING và tin không còn công khai", async () => {
  let result = await api("/api/recruiter/profile", "PATCH", { name: "Tên công ty mới" }, companyToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.data.verification_status, "PENDING");
  result = await api("/api/candidate/jobs/" + jobId, "GET", undefined, candidateToken);
  assert.equal(result.status, 404);
});

test("khóa tài khoản công ty làm tin ngừng công khai", async () => {
  assert.equal((await api("/api/admin/companies/" + companyId + "/verification", "PATCH", { status: "VERIFIED" }, adminToken)).status, 200);
  let result = await api("/api/admin/users/" + companyUserId + "/status", "PATCH", { status: "LOCKED" }, adminToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  result = await api("/api/candidate/jobs/" + jobId, "GET", undefined, candidateToken);
  assert.equal(result.status, 404);
  assert.equal((await api("/api/recruiter/profile", "GET", undefined, companyToken)).status, 401);
});

test("đổi mật khẩu thật làm JWT cũ hết hiệu lực", async () => {
  let result = await api("/api/auth/change-password", "PUT", { oldPassword: "TestPassword!2026", newPassword: "NewTestPassword!2026" }, candidateToken);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal((await api("/api/candidate/profile", "GET", undefined, candidateToken)).status, 401);
  assert.ok(await login("candidate@test.local", "NewTestPassword!2026"));
});

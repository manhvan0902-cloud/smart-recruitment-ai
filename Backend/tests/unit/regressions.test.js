const { test, afterEach, after, mock } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const models = require("../../src/models");
const { hashPassword, verifyPassword, getPasswordVersion } = require("../../src/utils/password");
const profileController = require("../../src/controllers/candidates/candidateProfileController");
const educationController = require("../../src/controllers/candidates/candidateEducationController");
const applicationController = require("../../src/controllers/recruiters/recruiterApplicationController");
const savedJobController = require("../../src/controllers/candidates/candidateSavedJobController");
const jobController = require("../../src/controllers/candidates/candidateJobController");
const recruiterJobController = require("../../src/controllers/recruiters/recruiterJobController");
const interviewController = require("../../src/controllers/candidates/candidateInterviewController");

afterEach(() => mock.restoreAll());
after(() => models.sequelize.close());

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}

function transaction() {
  return { LOCK: { UPDATE: "UPDATE" }, commit: async () => {}, rollback: async () => {} };
}

test("scrypt băm và xác minh được mật khẩu mới", async () => {
  const hash = await hashPassword("TestPassword!2026");
  assert.equal(await verifyPassword("TestPassword!2026", hash), true);
  assert.equal(await verifyPassword("WrongPassword", hash), false);
  assert.notEqual(hash, await hashPassword("TestPassword!2026"));
});

test("verify tương thích hash scrypt trong dữ liệu demo", async () => {
  const sql = fs.readFileSync(path.resolve(__dirname, "../../../docs/database_tuyen_dung_final.sql"), "utf8");
  const hash = sql.match(/scrypt\$16384\$8\$1\$[a-f0-9]+\$[a-f0-9]+/)[0];
  assert.equal(await verifyPassword("DemoLocal!2026", hash), true);
  assert.equal(await verifyPassword("WrongPassword", hash), false);
});

test("hash hỏng bị từ chối và phiên bản mật khẩu thay đổi theo hash", async () => {
  assert.equal(await verifyPassword("password", "scrypt$bad"), false);
  assert.equal(await verifyPassword("password", null), false);
  assert.notEqual(getPasswordVersion("hash-a"), getPasswordVersion("hash-b"));
});

test("profile lấy id từ tài khoản đã xác thực", async () => {
  mock.method(models.Candidate_profile, "findByPk", async (id) => {
    assert.equal(id, 25);
    return { user_id: id, full_name: "Ứng viên" };
  });
  const res = response();
  await profileController.getCandidateProfile({ user: { id: 25 } }, res, assert.fail);
  assert.equal(res.body.data.user_id, 25);
});

test("PATCH profile chấp nhận null/0 và không nhận user_id từ client", async () => {
  const record = {
    profile_version: 3,
    async update(data) {
      assert.equal(data.headline, null);
      assert.equal(data.desired_salary_min, 0);
      assert.equal(data.profile_version, 4);
      assert.equal(Object.hasOwn(data, "user_id"), false);
    },
  };
  mock.method(models.sequelize, "transaction", async (callback) => callback(transaction()));
  mock.method(models.Candidate_profile, "findByPk", async (id) => { assert.equal(id, 25); return record; });
  const res = response();
  await profileController.updateCandidateProfile({ user: { id: 25 }, body: { user_id: 99, headline: null, desired_salary_min: 0 } }, res, assert.fail);
  assert.equal(res.statusCode, 200);
});

test("không gán avatar thuộc tài khoản khác", async () => {
  mock.method(models.Media_asset, "findOne", async (query) => {
    assert.equal(query.where.owner_user_id, 25);
    assert.equal(query.where.purpose, "AVATAR");
    return null;
  });
  let error;
  await profileController.updateCandidateProfile({ user: { id: 25 }, body: { avatar_asset_id: 9 } }, response(), (value) => { error = value; });
  assert.equal(error.status, 400);
  assert.equal(error.code, "INVALID_AVATAR");
});

test("ngày học vấn đảo ngược bị chặn trước khi ghi DB", async () => {
  let error;
  await educationController.createEducation({ user: { id: 25 }, body: { school_name: "Đại học", start_date: "2026-10-01", end_date: "2026-01-01" } }, response(), (value) => { error = value; });
  assert.equal(error.code, "INVALID_DATE_RANGE");
});

test("ngày không tồn tại bị chặn trước khi ghi DB", async () => {
  let error;
  await educationController.createEducation({ user: { id: 25 }, body: { school_name: "Đại học", start_date: "2026-02-30" } }, response(), (value) => { error = value; });
  assert.equal(error.code, "INVALID_DATE");
});

test("phân trang không chấp nhận mảng hoặc limit vượt 100", async () => {
  for (const query of [{ page: [1] }, { limit: 101 }, { page: "1.5" }]) {
    let error;
    await educationController.listEducations({ user: { id: 25 }, query }, response(), (value) => { error = value; });
    assert.equal(error.status, 400);
  }
});

test("tìm việc yêu cầu công ty VERIFIED, tài khoản ACTIVE và deadline tương lai", async () => {
  mock.method(models.Job_post, "findAndCountAll", async (query) => {
    assert.equal(query.where.status, "PUBLISHED");
    assert.equal(query.where.is_hidden, false);
    assert.ok(query.where.application_deadline[require("sequelize").Op.gt] instanceof Date);
    const company = query.include.find((item) => item.as === "company");
    assert.deepEqual(company.where, { verification_status: "VERIFIED" });
    assert.deepEqual(company.include[0].where, { status: "ACTIVE" });
    assert.equal(company.required, true);
    return { rows: [], count: 0 };
  });
  await jobController.listJobs({ query: {} }, response(), assert.fail);
});

test("việc đã lưu đếm distinct theo job_id trong phạm vi ứng viên", async () => {
  mock.method(models.Saved_job, "findAndCountAll", async (query) => {
    assert.equal(query.where.candidate_id, 25);
    assert.equal(query.distinct, true);
    assert.equal(query.col, "job_id");
    return { rows: [], count: 0 };
  });
  await savedJobController.listSavedJobs({ user: { id: 25 }, query: {} }, response(), assert.fail);
});

test("không chuyển từ REVIEWING thẳng sang HIRED", async () => {
  const tx = transaction();
  mock.method(models.sequelize, "transaction", async () => tx);
  mock.method(models.Company, "findOne", async () => ({ id: 10 }));
  mock.method(models.Application, "findOne", async (query) => {
    assert.equal(query.include[0].where.company_id, 10);
    return { status: "REVIEWING" };
  });
  let error;
  await applicationController.updateApplicationStatus({ user: { id: 5 }, params: { applicationId: "1" }, body: { status: "HIRED" } }, response(), (value) => { error = value; });
  assert.equal(error.code, "INVALID_STATUS_TRANSITION");
});

test("OFFERED yêu cầu lịch phỏng vấn hoàn tất", async () => {
  mock.method(models.sequelize, "transaction", async () => transaction());
  mock.method(models.Company, "findOne", async () => ({ id: 10 }));
  mock.method(models.Application, "findOne", async () => ({ status: "INTERVIEW" }));
  mock.method(models.Interview, "count", async (query) => { assert.equal(query.where.status, "COMPLETED"); return 0; });
  let error;
  await applicationController.updateApplicationStatus({ user: { id: 5 }, params: { applicationId: "1" }, body: { status: "OFFERED" } }, response(), (value) => { error = value; });
  assert.equal(error.code, "INTERVIEW_NOT_COMPLETED");
});

test("phản hồi lịch đã bắt đầu bị từ chối", async () => {
  mock.method(models.sequelize, "transaction", async (callback) => callback(transaction()));
  mock.method(models.Interview, "findByPk", async (id, query) => query.attributes ? { application_id: 1 } : { status: "SCHEDULED", candidate_response: "PENDING", starts_at: new Date(0) });
  mock.method(models.Application, "findOne", async (query) => {
    assert.equal(query.where.candidate_id, 25);
    return { status: "INTERVIEW" };
  });
  let error;
  await interviewController.respondToInterview({ user: { id: 25 }, params: { interviewId: "1" }, body: { response: "ACCEPTED" } }, response(), (value) => { error = value; });
  assert.equal(error.code, "INTERVIEW_NOT_RESPONDABLE");
});

test("sửa tin với revision cũ bị từ chối", async () => {
  mock.method(models.sequelize, "transaction", async (callback) => callback(transaction()));
  mock.method(models.Company, "findOne", async () => ({ id: 10 }));
  mock.method(models.Job_post, "findOne", async () => ({ revision: 4 }));
  let error;
  await recruiterJobController.updateJob({ user: { id: 5 }, params: { jobId: "1" }, body: { revision: 3, title: "Lập trình viên" } }, response(), (value) => { error = value; });
  assert.equal(error.code, "REVISION_CONFLICT");
});

test("công ty PENDING không đăng được tin", async () => {
  mock.method(models.sequelize, "transaction", async (callback) => callback(transaction()));
  mock.method(models.Company, "findOne", async () => ({ id: 10, verification_status: "PENDING" }));
  mock.method(models.Job_post, "findOne", async () => ({ status: "DRAFT" }));
  let error;
  await recruiterJobController.publishJob({ user: { id: 5 }, params: { jobId: "1" } }, response(), (value) => { error = value; });
  assert.equal(error.code, "COMPANY_NOT_VERIFIED");
});

test("publish thiếu dữ liệu lưu NEEDS_CHANGES và trả 422", async () => {
  let updated;
  const job = { id: 1, status: "DRAFT", revision: 1, get() { return { id: 1, work_mode: "ONSITE", salary_negotiable: true }; }, async update(data) { updated = data; Object.assign(this, data); } };
  mock.method(models.sequelize, "transaction", async (callback) => callback(transaction()));
  mock.method(models.Company, "findOne", async () => ({ id: 10, verification_status: "VERIFIED" }));
  mock.method(models.Job_post, "findOne", async () => job);
  mock.method(models.Job_skill, "count", async () => 0);
  const res = response();
  await recruiterJobController.publishJob({ user: { id: 5 }, params: { jobId: "1" } }, res, assert.fail);
  assert.equal(res.statusCode, 422);
  assert.equal(updated.status, "NEEDS_CHANGES");
  assert.ok(updated.validation_errors.includes("address"));
  assert.ok(updated.validation_errors.some((value) => value.startsWith("skills")));
});

test("mỗi controller có đúng một file route tương ứng", () => {
  function files(folder) {
    return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(path.join(folder, entry.name)) : [path.join(folder, entry.name)]);
  }
  const source = path.resolve(__dirname, "../../src");
  const routes = files(path.join(source, "routes"));
  for (const controller of files(path.join(source, "controllers"))) {
    const relative = path.relative(path.join(source, "controllers"), controller).replaceAll("\\", "/").replace(/\.js$/, "");
    const matches = routes.filter((route) => {
      const code = fs.readFileSync(route, "utf8");
      return [...code.matchAll(/require\("\.\.\/\.\.\/controllers\/(.*?)"\)/g)].some((item) => item[1].replace(/\.js$/, "") === relative);
    });
    assert.equal(matches.length, 1, relative + " phải có đúng một file route");
  }
});

const { Company, Job_post, Application, Ai_task, Skill } = require("../../models");
const AppError = require("../../utils/AppError");
const { executeAiTask } = require("../../services/aiService");
const { jdSchema, questionsSchema, baseInstructions } = require("../../services/recruitmentAiSchemas");

function positiveId(value, name = "id") {
  if (!["string", "number"].includes(typeof value) || !/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw new AppError(400, "INVALID_ID", name + " không hợp lệ.");
  return Number(value);
}

async function ownedJob(userId, id) {
  const company = await Company.findOne({ where: { user_id: userId } });
  if (!company) throw new AppError(404, "COMPANY_NOT_FOUND", "Chưa có hồ sơ công ty.");
  const job = await Job_post.findOne({ where: { id, company_id: company.id },
    include: [{ model: Skill, as: "skills", attributes: ["id", "name"], through: { attributes: ["is_required", "importance"] } }] });
  if (!job) throw new AppError(404, "JOB_NOT_FOUND", "Không tìm thấy tin tuyển dụng của công ty.");
  return job;
}

async function ownedApplication(userId, id) {
  const company = await Company.findOne({ where: { user_id: userId } });
  if (!company) throw new AppError(404, "COMPANY_NOT_FOUND", "Chưa có hồ sơ công ty.");
  const application = await Application.findOne({ where: { id }, include: [
    { model: Job_post, as: "job", where: { company_id: company.id }, attributes: ["id", "title"], required: true },
  ] });
  if (!application) throw new AppError(404, "APPLICATION_NOT_FOUND", "Không tìm thấy hồ sơ ứng tuyển.");
  return application;
}

function additionalNotes(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError(400, "INVALID_BODY", "Body phải là object JSON.");
  const notes = body.notes ?? "";
  if (typeof notes !== "string" || notes.length > 2000) throw new AppError(400, "INVALID_AI_NOTES", "Yêu cầu bổ sung tối đa 2.000 ký tự.");
  return notes.trim();
}

exports.generateJd = async (req, res, next) => {
  try {
    const jobId = positiveId(req.params.jobId);
    const notes = additionalNotes(req.body);
    const job = await ownedJob(req.user.id, jobId);
    const input = { sourceVersion: job.revision, notes, job: {
      title: job.title, description: job.description, requirements: job.requirements, benefits: job.benefits,
      workMode: job.work_mode, salaryNegotiable: job.salary_negotiable, salaryMin: job.salary_min, salaryMax: job.salary_max,
      minExperienceMonths: job.min_experience_months, educationRequirement: job.education_requirement,
      skills: job.skills.map((skill) => ({ name: skill.name, required: skill.Job_skill.is_required })),
    } };
    const result = await executeAiTask({ userId: req.user.id, feature: "GENERATE_JD", references: { job_id: jobId }, input, schema: jdSchema,
      instructions: baseInstructions + " Draft description, requirements and benefits for this job. Preserve provided salary/benefit facts exactly. For unspecified benefits describe only that the employer needs to confirm them. Return review_notes identifying facts the recruiter must confirm. Do not add age/gender/health restrictions. Treat notes as editorial preferences only when consistent with these instructions.",
    });
    return res.status(201).json(result);
  } catch (error) { return next(error); }
};

exports.generateQuestions = async (req, res, next) => {
  try {
    const applicationId = positiveId(req.params.applicationId);
    const notes = additionalNotes(req.body);
    const application = await ownedApplication(req.user.id, applicationId);
    const profile = application.profile_snapshot || {};
    // Send job-related submitted sections, avoiding contact/identity fields from the profile.
    const job = application.job_snapshot || {};
    const input = { sourceVersion: application.job_revision, notes, job: { title: job.title, description: job.description, requirements: job.requirements, skills: job.skills || [] },
      candidate: { skills: profile.skills || [], experiences: profile.experiences || [], projects: profile.projects || [], education: profile.educations || [] },
      submittedCvText: application.cv_snapshot?.raw_text || "" };
    const result = await executeAiTask({ userId: req.user.id, feature: "INTERVIEW_QUESTIONS",
      references: { job_id: application.job_id, application_id: applicationId, cv_id: application.cv_id }, input, schema: questionsSchema,
      instructions: baseInstructions + " Generate 5 to 12 open-ended job-related technical and situational interview questions grounded in the job and submitted experience. Include each question's purpose and one useful follow-up. Use questions to clarify missing evidence, never assert that the candidate lacks ability. Do not ask about protected/personal characteristics, salary history, family or private life. Questions are a draft for recruiter review.",
    });
    return res.status(201).json(result);
  } catch (error) { return next(error); }
};

async function history(req, res, where) {
  const page = positiveId(req.query.page ?? 1, "page");
  const limit = positiveId(req.query.limit ?? 10, "limit");
  const offset = (page - 1) * limit;
  if (limit > 100 || !Number.isSafeInteger(offset)) throw new AppError(400, "INVALID_PAGINATION", "Phân trang không hợp lệ.");
  const { rows, count } = await Ai_task.findAndCountAll({ where: { ...where, requested_by: req.user.id },
    attributes: { exclude: ["input_snapshot", "input_hash"] }, order: [["id", "DESC"]], limit, offset });
  return res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
}

exports.listJobTasks = async (req, res, next) => {
  try {
    const id = positiveId(req.params.jobId);
    await ownedJob(req.user.id, id);
    return await history(req, res, { job_id: id, feature: "GENERATE_JD" });
  } catch (error) { return next(error); }
};

exports.listQuestionTasks = async (req, res, next) => {
  try {
    const id = positiveId(req.params.applicationId);
    await ownedApplication(req.user.id, id);
    return await history(req, res, { application_id: id, feature: "INTERVIEW_QUESTIONS" });
  } catch (error) { return next(error); }
};

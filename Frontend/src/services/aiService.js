import { apiRequest } from "./api";

export function analyzeCvWithAi(cvId, body, signal) {
  return apiRequest("/candidate/cvs/" + encodeURIComponent(cvId) + "/analyze", { method: "POST", body, signal });
}

export function matchCvWithAi(cvId, jobId, signal) {
  return apiRequest("/candidate/cvs/" + encodeURIComponent(cvId) + "/ai-matches", { method: "POST", body: { jobId }, signal });
}

export function listCvAnalysisTasks(cvId, query, signal) {
  return apiRequest("/candidate/cvs/" + encodeURIComponent(cvId) + "/ai-tasks", { query: { ...query, feature: "PARSE_CV" }, signal });
}

export function generateJobDescription(jobId, body, signal) {
  return apiRequest("/recruiter/jobs/" + encodeURIComponent(jobId) + "/ai-description", { method: "POST", body, signal });
}

export function listJobAiTasks(jobId, query, signal) {
  return apiRequest("/recruiter/jobs/" + encodeURIComponent(jobId) + "/ai-tasks", { query, signal });
}

export function generateInterviewQuestions(applicationId, body, signal) {
  return apiRequest("/recruiter/applications/" + encodeURIComponent(applicationId) + "/interview-questions", { method: "POST", body, signal });
}

export function listInterviewQuestionTasks(applicationId, query, signal) {
  return apiRequest("/recruiter/applications/" + encodeURIComponent(applicationId) + "/ai-tasks", { query, signal });
}

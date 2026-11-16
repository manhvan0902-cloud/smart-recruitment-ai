import { apiRequest } from "./api";

export function getCandidateCatalog(signal) {
  return apiRequest("/candidate/catalog", { signal });
}

export function listCandidateJobs(query, signal) {
  return apiRequest("/candidate/jobs", { query, signal });
}

export function getCandidateJob(jobId, signal) {
  return apiRequest("/candidate/jobs/" + encodeURIComponent(jobId), { signal });
}

export function listSavedJobs(query, signal) {
  return apiRequest("/candidate/saved-jobs", { query, signal });
}

export function saveCandidateJob(jobId, signal) {
  return apiRequest("/candidate/saved-jobs/" + encodeURIComponent(jobId), { method: "PUT", signal });
}

export function removeCandidateSavedJob(jobId, signal) {
  return apiRequest("/candidate/saved-jobs/" + encodeURIComponent(jobId), { method: "DELETE", signal });
}

export function getCandidateProfile(signal) {
  return apiRequest("/candidate/profile", { signal });
}

export function saveCandidateProfile(body, creating, signal) {
  return apiRequest("/candidate/profile", { method: creating ? "POST" : "PATCH", body, signal });
}

export function listProfileRecords(resource, query, signal) {
  return apiRequest("/candidate/" + encodeURIComponent(resource), { query, signal });
}

export function saveProfileRecord(resource, recordId, body, signal) {
  const path = "/candidate/" + encodeURIComponent(resource);
  if (recordId != null) return apiRequest(path + "/" + encodeURIComponent(recordId), { method: "PATCH", body, signal });
  return apiRequest(path, { method: "POST", body, signal });
}

export function deleteProfileRecord(resource, recordId, signal) {
  return apiRequest("/candidate/" + encodeURIComponent(resource) + "/" + encodeURIComponent(recordId), { method: "DELETE", signal });
}

export function getCandidateSkills(signal) {
  return apiRequest("/candidate/skills", { signal });
}

export function saveCandidateSkills(skills, signal) {
  return apiRequest("/candidate/skills", { method: "PUT", body: { skills }, signal });
}

export function listCandidateCvs(query, signal) {
  return apiRequest("/candidate/cvs", { query, signal });
}

export function getCandidateCv(cvId, signal) {
  return apiRequest("/candidate/cvs/" + encodeURIComponent(cvId), { signal });
}

export function uploadCandidateCv(file, name, signal) {
  const body = new FormData();
  body.append("file", file);
  body.append("name", name);
  return apiRequest("/candidate/cvs", { method: "POST", body, signal });
}

export function getCandidateCvDownload(cvId, signal) {
  return apiRequest("/candidate/cvs/" + encodeURIComponent(cvId) + "/download", { signal });
}

export function archiveCandidateCv(cvId, signal) {
  return apiRequest("/candidate/cvs/" + encodeURIComponent(cvId) + "/archive", { method: "PATCH", signal });
}

export function applyToCandidateJob(jobId, body, signal) {
  return apiRequest("/candidate/jobs/" + encodeURIComponent(jobId) + "/applications", { method: "POST", body, signal });
}

export function listCandidateApplications(query, signal) {
  return apiRequest("/candidate/applications", { query, signal });
}

export function getCandidateApplication(applicationId, signal) {
  return apiRequest("/candidate/applications/" + encodeURIComponent(applicationId), { signal });
}

export function withdrawCandidateApplication(applicationId, signal) {
  return apiRequest("/candidate/applications/" + encodeURIComponent(applicationId) + "/withdraw", { method: "PATCH", signal });
}

export function listCandidateInterviews(query, signal) {
  return apiRequest("/candidate/interviews", { query, signal });
}

export function respondToCandidateInterview(interviewId, response, signal) {
  return apiRequest("/candidate/interviews/" + encodeURIComponent(interviewId) + "/response", { method: "PATCH", body: { response }, signal });
}

export function parseCandidateCv(cvId, signal) {
  return apiRequest("/candidate/cvs/" + encodeURIComponent(cvId) + "/parse", { method: "POST", signal });
}

export function createCandidateCvMatches(cvId, body, signal) {
  return apiRequest("/candidate/cvs/" + encodeURIComponent(cvId) + "/matches", { method: "POST", body, signal });
}

export function listCandidateCvMatches(cvId, query, signal) {
  return apiRequest("/candidate/cvs/" + encodeURIComponent(cvId) + "/matches", { query, signal });
}

export function getCandidateTask(taskId, signal) {
  return apiRequest("/candidate/ai-tasks/" + encodeURIComponent(taskId), { signal });
}

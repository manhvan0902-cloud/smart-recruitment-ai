import { apiRequest } from "./api";

export function getCompanyProfile(signal) {
  return apiRequest("/recruiter/profile", { signal });
}

export function getRecruiterCatalog(signal) {
  return apiRequest("/recruiter/catalog", { signal });
}

export function createCompanyProfile(body, signal) {
  return apiRequest("/recruiter/profile", { method: "POST", body, signal });
}

export function updateCompanyProfile(body, signal) {
  return apiRequest("/recruiter/profile", { method: "PATCH", body, signal });
}

export function uploadCompanyLogo(file, signal) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest("/recruiter/profile/logo", { method: "POST", body, signal });
}

export function deleteCompanyLogo(signal) {
  return apiRequest("/recruiter/profile/logo", { method: "DELETE", signal });
}

export function listRecruiterJobs(query, signal) {
  return apiRequest("/recruiter/jobs", { query, signal });
}

export function getRecruiterJob(jobId, signal) {
  return apiRequest("/recruiter/jobs/" + encodeURIComponent(jobId), { signal });
}

export function createRecruiterJob(body, signal) {
  return apiRequest("/recruiter/jobs", { method: "POST", body, signal });
}

export function updateRecruiterJob(jobId, body, signal) {
  return apiRequest("/recruiter/jobs/" + encodeURIComponent(jobId), { method: "PATCH", body, signal });
}

export function replaceRecruiterJobSkills(jobId, body, signal) {
  return apiRequest("/recruiter/jobs/" + encodeURIComponent(jobId) + "/skills", { method: "PUT", body, signal });
}

export function publishRecruiterJob(jobId, signal) {
  return apiRequest("/recruiter/jobs/" + encodeURIComponent(jobId) + "/publish", { method: "POST", signal });
}

export function closeRecruiterJob(jobId, signal) {
  return apiRequest("/recruiter/jobs/" + encodeURIComponent(jobId) + "/close", { method: "POST", signal });
}

export function listRecruiterApplications(query, signal) {
  return apiRequest("/recruiter/applications", { query, signal });
}

export function getRecruiterApplication(applicationId, signal) {
  return apiRequest("/recruiter/applications/" + encodeURIComponent(applicationId), { signal });
}

export function getRecruiterApplicationCvDownload(applicationId, signal) {
  return apiRequest("/recruiter/applications/" + encodeURIComponent(applicationId) + "/cv-download", { signal });
}

export function updateRecruiterApplication(applicationId, body, signal) {
  return apiRequest("/recruiter/applications/" + encodeURIComponent(applicationId) + "/status", { method: "PATCH", body, signal });
}

export function listRecruiterInterviews(query, signal) {
  return apiRequest("/recruiter/interviews", { query, signal });
}

export function createRecruiterInterview(applicationId, body, signal) {
  return apiRequest("/recruiter/applications/" + encodeURIComponent(applicationId) + "/interviews", { method: "POST", body, signal });
}

export function updateRecruiterInterview(interviewId, body, signal) {
  return apiRequest("/recruiter/interviews/" + encodeURIComponent(interviewId), { method: "PATCH", body, signal });
}

export function cancelRecruiterInterview(interviewId, signal) {
  return apiRequest("/recruiter/interviews/" + encodeURIComponent(interviewId) + "/cancel", { method: "PATCH", signal });
}

export function completeRecruiterInterview(interviewId, signal) {
  return apiRequest("/recruiter/interviews/" + encodeURIComponent(interviewId) + "/complete", { method: "PATCH", signal });
}

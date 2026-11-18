import { apiRequest } from "./api";

export function getPublicCatalog(signal) {
  return apiRequest("/public/catalog", { auth: false, signal });
}

export function listPublicJobs(query, signal) {
  return apiRequest("/public/jobs", { auth: false, query, signal });
}

export function getPublicJob(jobId, signal) {
  return apiRequest("/public/jobs/" + encodeURIComponent(jobId), { auth: false, signal });
}

export function getPublicCompany(companyId, signal) {
  return apiRequest("/public/companies/" + encodeURIComponent(companyId), { auth: false, signal });
}

export function listPublicCompanyJobs(companyId, query, signal) {
  return apiRequest("/public/companies/" + encodeURIComponent(companyId) + "/jobs", { auth: false, query, signal });
}

import { apiRequest } from "./api";

export function listCompanies(query, signal) {
  return apiRequest("/admin/companies", { query, signal });
}

export function verifyCompany(companyId, body, signal) {
  return apiRequest("/admin/companies/" + encodeURIComponent(companyId) + "/verification", {
    method: "PATCH",
    body,
    signal,
  });
}

export function listUsers(query, signal) {
  return apiRequest("/admin/users", { query, signal });
}

export function updateUserStatus(userId, status, signal) {
  return apiRequest("/admin/users/" + encodeURIComponent(userId) + "/status", {
    method: "PATCH",
    body: { status },
    signal,
  });
}

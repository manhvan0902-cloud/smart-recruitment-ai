import { apiRequest } from "./api";

export function loginAccount(values, signal) {
  return apiRequest("/auth/login", { method: "POST", body: values, auth: false, signal });
}

export function registerAccount(values, signal) {
  return apiRequest("/auth/register", { method: "POST", body: values, auth: false, signal });
}

export function changePassword(values, token, signal) {
  return apiRequest("/auth/change-password", { method: "PUT", body: values, token, signal });
}

export async function verifySession(session, signal) {
  const endpoints = {
    CANDIDATE: "/candidate/catalog",
    COMPANY: "/recruiter/catalog",
    ADMIN: "/admin/users?limit=1",
  };

  await apiRequest(endpoints[session.user.role], { token: session.token, signal });
}

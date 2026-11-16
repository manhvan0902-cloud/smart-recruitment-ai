import { apiRequest } from "./api";

function prefix(role) {
  if (role === "CANDIDATE") return "/candidate/notifications";
  if (role === "COMPANY") return "/recruiter/notifications";
  throw new Error("Vai trò này không có hộp thông báo.");
}

export function listNotifications(role, query, signal) {
  return apiRequest(prefix(role), { query, signal });
}

export function markNotificationRead(role, notificationId, signal) {
  return apiRequest(prefix(role) + "/" + encodeURIComponent(notificationId) + "/read", { method: "PATCH", signal });
}

export function markAllNotificationsRead(role, signal) {
  return apiRequest(prefix(role) + "/read-all", { method: "PATCH", signal });
}

const storageKey = "smart-recruitment.session";
const roles = ["CANDIDATE", "COMPANY", "ADMIN"];

// Đọc hạn dùng để cập nhật giao diện. Backend xác minh chữ ký và quyền truy cập.
export function getTokenPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export function isValidSession(session) {
  if (!session || typeof session.token !== "string" || !session.user) return false;
  const { user } = session;
  const payload = getTokenPayload(session.token);
  return roles.includes(user.role)
    && typeof user.email === "string"
    && user.id != null
    && payload?.userId != null
    && String(payload.userId) === String(user.id)
    && payload.email === user.email
    && Number.isFinite(payload.exp)
    && payload.exp * 1000 > Date.now();
}

export function readSession() {
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return null;
    const session = JSON.parse(stored);
    if (isValidSession(session)) return session;
    clearSession();
  } catch {
    clearSession();
  }
  return null;
}

export function saveSession(session) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(session));
  } catch {
    // Trình duyệt chặn storage thì phiên hiện tại vẫn dùng bộ nhớ của React.
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // Phiên trong bộ nhớ vẫn được xóa khi storage không truy cập được.
  }
}

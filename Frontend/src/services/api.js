import { readSession } from "../utils/session";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
const sessionErrorCodes = new Set(["AUTHENTICATION_REQUIRED", "INVALID_TOKEN", "INVALID_ACCOUNT"]);
let unauthorizedHandler;
let accessToken = readSession()?.token;

export class ApiError extends Error {
  constructor(message, status = 0, code = "REQUEST_ERROR", fields = [], response = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.response = response;
  }
}

export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = undefined;
  };
}

export function setAccessToken(token) {
  accessToken = token;
}

export async function apiRequest(path, options = {}) {
  const { body, query, auth = true, token = accessToken, headers, ...fetchOptions } = options;
  const url = new URL(apiBaseUrl + path, window.location.origin);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (auth && token) requestHeaders.set("Authorization", "Bearer " + token);

  let requestBody = body;
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
      body: requestBody,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Không kết nối được máy chủ. Hãy kiểm tra kết nối và thử lại.", 0, "NETWORK_ERROR");
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new ApiError(
      data?.error?.message || "Yêu cầu thất bại. Vui lòng thử lại.",
      response.status,
      data?.error?.code || "REQUEST_ERROR",
      data?.error?.fields || [],
      data,
    );
    if (auth && response.status === 401 && sessionErrorCodes.has(error.code)) {
      unauthorizedHandler?.(token);
    }
    throw error;
  }

  if (data === null) {
    throw new ApiError("Máy chủ trả về dữ liệu không hợp lệ.", response.status, "INVALID_RESPONSE");
  }
  return data;
}

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ApiError, onUnauthorized, setAccessToken } from "../services/api";
import { loginAccount, verifySession } from "../services/authService";
import { clearSession, getTokenPayload, isValidSession, readSession, saveSession } from "../utils/session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [status, setStatus] = useState(() => session ? "checking" : "anonymous");
  const [sessionError, setSessionError] = useState("");
  const [notice, setNotice] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const sessionRef = useRef(session);

  const logout = useCallback((message = "") => {
    clearSession();
    setAccessToken(undefined);
    sessionRef.current = null;
    setSession(null);
    setStatus("anonymous");
    setSessionError("");
    setNotice(message);
  }, []);

  useEffect(() => onUnauthorized((token) => {
    if (sessionRef.current?.token === token) {
      logout("Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.");
    }
  }), [logout]);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    setAccessToken(session.token);
    setStatus("checking");
    setSessionError("");

    verifySession(session, controller.signal)
      .then(() => {
        if (!controller.signal.aborted && sessionRef.current?.token === session.token) {
          setStatus("authenticated");
        }
      })
      .catch((error) => {
        if (controller.signal.aborted || sessionRef.current?.token !== session.token) return;
        if (error.status === 401 || error.status === 403) {
          logout("Tài khoản hoặc quyền truy cập đã thay đổi. Vui lòng đăng nhập lại.");
          return;
        }
        setSessionError(error.message);
        setStatus("unavailable");
      });

    return () => controller.abort();
  }, [session, retryCount, logout]);

  useEffect(() => {
    if (!session) return;
    const expiresAt = getTokenPayload(session.token).exp * 1000;
    let timer;

    function scheduleExpiration() {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        if (sessionRef.current?.token === session.token) {
          logout("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }
        return;
      }
      timer = window.setTimeout(scheduleExpiration, Math.min(remaining, 2147483647));
    }

    scheduleExpiration();
    return () => window.clearTimeout(timer);
  }, [session, logout]);

  async function login(values, signal) {
    const result = await loginAccount(values, signal);
    if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
    const nextSession = result.data;
    if (!isValidSession(nextSession)) {
      throw new ApiError("Thông tin đăng nhập máy chủ trả về không hợp lệ.", 502, "INVALID_SESSION");
    }

    saveSession(nextSession);
    setAccessToken(nextSession.token);
    sessionRef.current = nextSession;
    setSession(nextSession);
    setStatus("checking");
    setNotice("");
    return nextSession.user;
  }

  return (
    <AuthContext.Provider value={{
      user: session?.user || null,
      token: session?.token,
      status,
      notice,
      sessionError,
      login,
      logout,
      retrySession: () => setRetryCount((value) => value + 1),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth cần được sử dụng trong AuthProvider.");
  return context;
}

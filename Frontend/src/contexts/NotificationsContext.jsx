import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { listNotifications } from "../services/notificationService";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ role, children }) {
  const enabled = ["CANDIDATE", "COMPANY"].includes(role);
  const [unreadCount, setUnreadCount] = useState(null);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const latestRequest = useRef(null);
  const refresh = useCallback(() => setRefreshCount((value) => value + 1), []);
  // Invalidate an older count request before accepting a newer inbox response.
  const acceptCount = useCallback((count) => {
    latestRequest.current?.abort();
    setUnreadCount(Number(count));
    setError("");
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    latestRequest.current = controller;
    listNotifications(role, { page: 1, limit: 1 }, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setUnreadCount(Number(result.unreadCount)); setError(""); } })
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError.message); });
    return () => controller.abort();
  }, [role, enabled, refreshCount]);

  useEffect(() => {
    if (!enabled) return;
    function whenVisible() { if (document.visibilityState === "visible") refresh(); }
    const timer = window.setInterval(whenVisible, 60000);
    window.addEventListener("focus", whenVisible);
    document.addEventListener("visibilitychange", whenVisible);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", whenVisible); document.removeEventListener("visibilitychange", whenVisible); };
  }, [enabled, refresh]);

  return <NotificationsContext.Provider value={{ enabled, unreadCount, error, refresh, acceptCount }}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationsContext);
}

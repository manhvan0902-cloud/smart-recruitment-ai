import { Navigate, Outlet } from "react-router-dom";
import SessionStatus from "../components/SessionStatus";
import { homePaths } from "../config/navigation";
import { useAuth } from "../contexts/AuthContext";

export default function GuestRoute() {
  const { user, status } = useAuth();
  if (status === "checking" || status === "unavailable") return <SessionStatus />;
  if (user) return <Navigate to={homePaths[user.role]} replace />;
  return <Outlet />;
}

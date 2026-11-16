import { Navigate, Outlet, useLocation } from "react-router-dom";
import SessionStatus from "../components/SessionStatus";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ roles }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "checking" || status === "unavailable") return <SessionStatus />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/403" replace />;
  return <Outlet />;
}

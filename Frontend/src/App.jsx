import { Navigate, Route, Routes } from "react-router-dom";
import SessionStatus from "./components/SessionStatus";
import { homePaths } from "./config/navigation";
import { useAuth } from "./contexts/AuthContext";
import AuthLayout from "./layouts/AuthLayout";
import WorkspaceLayout from "./layouts/WorkspaceLayout";
import AccessPage from "./pages/AccessPage";
import ChangePasswordPage from "./pages/auth/ChangePasswordPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import CompaniesPage from "./pages/admin/CompaniesPage";
import UsersPage from "./pages/admin/UsersPage";
import CompanyProfilePage from "./pages/recruiter/CompanyProfilePage";
import RecruiterJobsPage from "./pages/recruiter/RecruiterJobsPage";
import JobEditorPage from "./pages/recruiter/JobEditorPage";
import JobsPage from "./pages/candidate/JobsPage";
import JobDetailsPage from "./pages/candidate/JobDetailsPage";
import SavedJobsPage from "./pages/candidate/SavedJobsPage";
import ProfilePage from "./pages/candidate/ProfilePage";
import CvsPage from "./pages/candidate/CvsPage";
import CvDetailsPage from "./pages/candidate/CvDetailsPage";
import CvMatchesPage from "./pages/candidate/CvMatchesPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import ApplicationDetailsPage from "./pages/ApplicationDetailsPage";
import InterviewsPage from "./pages/InterviewsPage";
import NotificationsPage from "./pages/NotificationsPage";
import GuestRoute from "./routes/GuestRoute";
import ProtectedRoute from "./routes/ProtectedRoute";

function HomeRedirect() {
  const { user, status } = useAuth();
  if (status === "checking" || status === "unavailable") return <SessionStatus />;
  return <Navigate to={homePaths[user?.role] || "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<WorkspaceLayout />}>
          <Route path="/account/change-password" element={<ChangePasswordPage />} />
          <Route path="/403" element={<AccessPage forbidden />} />
          <Route element={<ProtectedRoute roles={["CANDIDATE"]} />}>
            <Route path="/candidate">
              <Route index element={<Navigate to="jobs" replace />} />
              <Route path="jobs" element={<JobsPage />} />
              <Route path="jobs/:jobId" element={<JobDetailsPage />} />
              <Route path="saved-jobs" element={<SavedJobsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="cvs" element={<CvsPage />} />
              <Route path="cvs/:cvId" element={<CvDetailsPage />} />
              <Route path="cvs/:cvId/matches" element={<CvMatchesPage />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="applications/:applicationId" element={<ApplicationDetailsPage />} />
              <Route path="interviews" element={<InterviewsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="*" element={<AccessPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute roles={["COMPANY"]} />}>
            <Route path="/recruiter">
              <Route index element={<Navigate to="jobs" replace />} />
              <Route path="profile" element={<CompanyProfilePage />} />
              <Route path="jobs" element={<RecruiterJobsPage />} />
              <Route path="jobs/new" element={<JobEditorPage />} />
              <Route path="jobs/:jobId" element={<JobEditorPage />} />
              <Route path="applications" element={<ApplicationsPage recruiter />} />
              <Route path="applications/:applicationId" element={<ApplicationDetailsPage recruiter />} />
              <Route path="interviews" element={<InterviewsPage recruiter />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="*" element={<AccessPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="/admin">
              <Route index element={<Navigate to="companies" replace />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="*" element={<AccessPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<AccessPage />} />
    </Routes>
  );
}

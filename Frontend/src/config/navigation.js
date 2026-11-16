import {
  BankOutlined,
  BellOutlined,
  CalendarOutlined,
  FileTextOutlined,
  IdcardOutlined,
  SearchOutlined,
  SolutionOutlined,
  StarOutlined,
  TeamOutlined,
} from "@ant-design/icons";

export const roleLabels = {
  CANDIDATE: "Ứng viên",
  COMPANY: "Nhà tuyển dụng",
  ADMIN: "Quản trị viên",
};

export const homePaths = {
  CANDIDATE: "/candidate/jobs",
  COMPANY: "/recruiter/jobs",
  ADMIN: "/admin/companies",
};

export const navigation = {
  CANDIDATE: [
    { path: "/candidate/jobs", label: "Tìm việc", icon: SearchOutlined },
    { path: "/candidate/saved-jobs", label: "Việc đã lưu", icon: StarOutlined },
    { path: "/candidate/applications", label: "Đơn ứng tuyển", icon: SolutionOutlined },
    { path: "/candidate/interviews", label: "Lịch phỏng vấn", icon: CalendarOutlined },
    { path: "/candidate/notifications", label: "Thông báo", icon: BellOutlined },
  ],
  COMPANY: [
    { path: "/recruiter/profile", label: "Hồ sơ công ty", icon: BankOutlined },
    { path: "/recruiter/jobs", label: "Tin tuyển dụng", icon: FileTextOutlined },
    { path: "/recruiter/applications", label: "Đơn ứng tuyển", icon: SolutionOutlined },
    { path: "/recruiter/interviews", label: "Lịch phỏng vấn", icon: CalendarOutlined },
    { path: "/recruiter/notifications", label: "Thông báo", icon: BellOutlined },
  ],
  ADMIN: [
    { path: "/admin/companies", label: "Xác minh công ty", icon: BankOutlined },
    { path: "/admin/users", label: "Tài khoản", icon: TeamOutlined },
  ],
};

export const candidateAccountLinks = [
  { path: "/candidate/profile", label: "Hồ sơ cá nhân", icon: IdcardOutlined },
  { path: "/candidate/cvs", label: "CV của tôi", icon: FileTextOutlined },
];

export function getLoginDestination(role, requestedPath) {
  const home = homePaths[role] || "/login";
  const prefix = home.slice(0, home.lastIndexOf("/"));

  if (typeof requestedPath !== "string") return home;
  if (requestedPath === "/account/change-password") return requestedPath;
  if (requestedPath.startsWith(prefix + "/")) return requestedPath;
  return home;
}

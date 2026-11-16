import { Badge, Tooltip } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";

export default function NotificationBell() {
  const { user } = useAuth();
  const notifications = useNotifications();
  if (!notifications?.enabled) return null;
  const label = notifications.error ? "Thông báo: chưa cập nhật được số chưa đọc" : notifications.unreadCount == null ? "Thông báo" : `Thông báo: ${notifications.unreadCount} chưa đọc`;
  return <Tooltip title={label}><Link className="notification-bell" to={user.role === "COMPANY" ? "/recruiter/notifications" : "/candidate/notifications"} aria-label={label}>
    <Badge count={notifications.unreadCount || 0} overflowCount={99} dot={Boolean(notifications.error)}><BellOutlined /></Badge>
  </Link></Tooltip>;
}

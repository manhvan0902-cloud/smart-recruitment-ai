import { Avatar, Button, Dropdown } from "antd";
import { DownOutlined, LockOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { candidateAccountLinks, roleLabels } from "../config/navigation";
import { useAuth } from "../contexts/AuthContext";

export default function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const name = user.username || user.email.split("@")[0];
  const items = [];

  if (user.role === "CANDIDATE") {
    for (const item of candidateAccountLinks) {
      const Icon = item.icon;
      items.push({ key: item.path, label: item.label, icon: <Icon /> });
    }
    items.push({ type: "divider" });
  }
  items.push(
    { key: "/account/change-password", label: "Đổi mật khẩu", icon: <LockOutlined /> },
    { key: "logout", label: "Đăng xuất", icon: <LogoutOutlined />, danger: true },
  );

  function handleClick({ key }) {
    if (key === "logout") {
      logout();
      navigate("/login", { replace: true });
      return;
    }
    navigate(key);
  }

  return (
    <Dropdown menu={{ items, onClick: handleClick }} trigger={["click"]} placement="bottomRight">
      <Button type="text" className="account-button" aria-label="Mở menu tài khoản">
        <span className="account-trigger">
          <Avatar className="account-avatar" size={36}>{name.slice(0, 1).toUpperCase()}</Avatar>
          <span className="account-copy">
            <span className="account-name">{name}</span>
            <span className="account-role">{roleLabels[user.role]}</span>
          </span>
          <DownOutlined className="account-chevron" />
        </span>
      </Button>
    </Dropdown>
  );
}

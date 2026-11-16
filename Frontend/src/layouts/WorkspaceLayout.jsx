import { useEffect, useState } from "react";
import { Button, Drawer, Layout, Menu } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AccountMenu from "../components/AccountMenu";
import Brand from "../components/Brand";
import NotificationBell from "../components/NotificationBell";
import { NotificationsProvider } from "../contexts/NotificationsContext";
import { candidateAccountLinks, homePaths, navigation } from "../config/navigation";
import { useAuth } from "../contexts/AuthContext";

const { Header, Sider, Content } = Layout;

function menuItems(links) {
  return links.map((item) => {
    const Icon = item.icon;
    return { key: item.path, label: item.label, icon: <Icon /> };
  });
}

export default function WorkspaceLayout() {
  const { user } = useAuth();
  return <NotificationsProvider key={`${user.id}:${user.role}`} role={user.role}><Workspace /></NotificationsProvider>;
}

function Workspace() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isCandidate = user.role === "CANDIDATE";
  const links = navigation[user.role];
  const mobileLinks = isCandidate ? [...links, ...candidateAccountLinks] : links;
  const active = mobileLinks.find((item) => location.pathname === item.path || location.pathname.startsWith(item.path + "/"));
  const selectedKeys = active ? [active.path] : [];

  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  function handleMenuClick({ key }) {
    setDrawerOpen(false);
    navigate(key);
  }

  return (
    <Layout className={isCandidate ? "workspace candidate-workspace" : "workspace management-workspace"}>
      <a className="skip-link" href="#main-content">Đến nội dung chính</a>
      {!isCandidate && (
        <Sider width={240} theme="light" className="desktop-sidebar">
          <div className="sidebar-brand"><Brand to={homePaths[user.role]} /></div>
          <nav aria-label="Menu chính">
            <Menu mode="inline" items={menuItems(links)} selectedKeys={selectedKeys} onClick={handleMenuClick} />
          </nav>
        </Sider>
      )}
      <Layout className="workspace-body">
        <Header className="workspace-header">
          <div className="header-inner">
            <Button
              className="mobile-menu-button"
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
              aria-label="Mở menu điều hướng"
              aria-expanded={drawerOpen}
            />
            {isCandidate ? <Brand to={homePaths[user.role]} /> : <span className="workspace-label">{user.role === "ADMIN" ? "Quản trị hệ thống" : "Không gian tuyển dụng"}</span>}
            {isCandidate && (
              <nav className="candidate-navigation" aria-label="Menu chính">
                <Menu mode="horizontal" items={menuItems(links)} selectedKeys={selectedKeys} onClick={handleMenuClick} />
              </nav>
            )}
            <div className="header-account"><NotificationBell /><AccountMenu /></div>
          </div>
        </Header>
        <Content id="main-content" className="workspace-content" tabIndex={-1}>
          <div className="content-inner"><Outlet /></div>
        </Content>
      </Layout>
      <Drawer title="Điều hướng" placement="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <nav aria-label="Menu trên điện thoại">
          <Menu mode="inline" items={menuItems(mobileLinks)} selectedKeys={selectedKeys} onClick={handleMenuClick} />
        </nav>
      </Drawer>
    </Layout>
  );
}

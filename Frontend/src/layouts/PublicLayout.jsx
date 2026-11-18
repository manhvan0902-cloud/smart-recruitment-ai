import { useEffect } from "react";
import { Button } from "antd";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import AccountMenu from "../components/AccountMenu";
import Brand from "../components/Brand";
import { homePaths } from "../config/navigation";
import { useAuth } from "../contexts/AuthContext";

export default function PublicLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const from = location.pathname + location.search;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <div className="public-layout">
      <a className="skip-link" href="#public-main">Đến nội dung chính</a>
      <header className="public-header">
        <div className="public-header-inner">
          <Brand to="/" />
          <nav className="public-navigation" aria-label="Điều hướng chính">
            <NavLink to="/" end>Trang chủ</NavLink>
            <NavLink to="/jobs">Việc làm</NavLink>
          </nav>
          <div className="public-account">
            {user ? <>
              <Link className="public-workspace-link" to={homePaths[user.role]}>Vào tài khoản</Link>
              <AccountMenu />
            </> : <>
              <Link to="/login" state={{ from }}><Button>Đăng nhập</Button></Link>
              <Link to="/register" state={{ from }}><Button type="primary">Đăng ký</Button></Link>
            </>}
          </div>
        </div>
      </header>
      <main id="public-main" className="public-content" tabIndex={-1}><Outlet /></main>
      <footer className="public-footer">
        <Brand to="/" />
        <nav aria-label="Liên kết cuối trang">
          <Link to="/jobs">Tìm việc làm</Link>
          {user ? <Link to={homePaths[user.role]}>Tài khoản của tôi</Link> : <Link to="/register">Tạo tài khoản</Link>}
        </nav>
      </footer>
    </div>
  );
}

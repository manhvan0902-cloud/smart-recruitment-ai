import { Link, Outlet } from "react-router-dom";
import Brand from "../components/Brand";

export default function AuthLayout() {
  return (
    <main className="auth-screen">
      <div className="auth-container">
        <div className="auth-brand"><Brand to="/" /></div>
        <section className="auth-card">
          <Outlet />
        </section>
        <p className="auth-switch"><Link to="/">Về trang chủ tìm việc</Link></p>
      </div>
    </main>
  );
}

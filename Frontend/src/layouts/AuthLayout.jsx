import { Outlet } from "react-router-dom";
import Brand from "../components/Brand";

export default function AuthLayout() {
  return (
    <main className="auth-screen">
      <div className="auth-container">
        <div className="auth-brand"><Brand to="/login" /></div>
        <section className="auth-card">
          <Outlet />
        </section>
      </div>
    </main>
  );
}

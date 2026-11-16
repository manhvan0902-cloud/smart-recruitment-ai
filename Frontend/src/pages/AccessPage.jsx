import { useEffect } from "react";
import { Button, Result } from "antd";
import { Link } from "react-router-dom";
import { homePaths } from "../config/navigation";
import { useAuth } from "../contexts/AuthContext";

export default function AccessPage({ forbidden = false }) {
  const { user } = useAuth();
  const title = forbidden ? "Bạn chưa có quyền truy cập trang này" : "Không tìm thấy trang";

  useEffect(() => {
    document.title = title + " | Smart Recruitment";
  }, [title]);

  return (
    <section className="access-screen">
      <Result
        status={forbidden ? "403" : "404"}
        title={title}
        subTitle={forbidden ? "Hãy quay về khu vực phù hợp với tài khoản của bạn." : "Đường dẫn có thể đã thay đổi hoặc không tồn tại."}
        extra={<Link to={homePaths[user?.role] || "/login"}><Button type="primary">{user ? "Về trang chính" : "Về đăng nhập"}</Button></Link>}
      />
    </section>
  );
}

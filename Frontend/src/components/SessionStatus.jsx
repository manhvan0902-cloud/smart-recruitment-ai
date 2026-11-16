import { Button, Result, Spin } from "antd";
import { useAuth } from "../contexts/AuthContext";

export default function SessionStatus() {
  const { status, sessionError, retrySession, logout } = useAuth();

  if (status === "unavailable") {
    return (
      <main className="session-screen">
        <Result
          status="warning"
          title="Chưa xác nhận được phiên đăng nhập"
          subTitle={sessionError}
          extra={[
            <Button key="retry" type="primary" onClick={retrySession}>Thử lại</Button>,
            <Button key="logout" onClick={() => logout()}>Về đăng nhập</Button>,
          ]}
        />
      </main>
    );
  }

  return (
    <main className="session-screen" role="status" aria-live="polite" aria-busy="true">
      <Spin size="large" />
      <p>Đang xác nhận phiên đăng nhập…</p>
    </main>
  );
}

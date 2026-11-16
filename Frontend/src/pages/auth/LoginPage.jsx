import { useEffect, useRef, useState } from "react";
import { Alert, Button, Form, Input } from "antd";
import { ArrowRightOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getLoginDestination } from "../../config/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { emailRules } from "../../utils/formRules";

export default function LoginPage() {
  const { login, notice } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(null);
  const { registeredEmail, passwordChanged, from } = location.state || {};

  useEffect(() => {
    document.title = "Đăng nhập | Smart Recruitment";
    return () => request.current?.abort();
  }, []);

  async function handleSubmit(values) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setSubmitting(true);
    setError("");

    try {
      const user = await login({ email: values.email.trim(), password: values.password }, controller.signal);
      navigate(getLoginDestination(user.role, from), { replace: true });
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError.message);
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }

  return (
    <>
      <div className="auth-heading">
        <h1>Chào mừng trở lại</h1>
        <p>Đăng nhập để tiếp tục với tài khoản của bạn.</p>
      </div>
      {registeredEmail && <Alert className="form-alert" type="success" showIcon title="Đăng ký thành công. Bạn có thể đăng nhập ngay." />}
      {passwordChanged && <Alert className="form-alert" type="success" showIcon title="Đã đổi mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới." />}
      {notice && <Alert className="form-alert" type="warning" showIcon title={notice} />}
      {error && <Alert className="form-alert" type="error" role="alert" showIcon title={error} />}
      <Form
        name="login"
        layout="vertical"
        requiredMark={false}
        initialValues={{ email: registeredEmail || "" }}
        disabled={submitting}
        onFinish={handleSubmit}
        onValuesChange={() => setError("")}
      >
        <Form.Item name="email" label="Email" rules={emailRules}>
          <Input prefix={<MailOutlined />} placeholder="ban@example.com" autoComplete="username" inputMode="email" maxLength={254} size="large" />
        </Form.Item>
        <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: "Vui lòng nhập mật khẩu." }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu" autoComplete="current-password" size="large" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={submitting} icon={<ArrowRightOutlined />} iconPlacement="end">
          Đăng nhập
        </Button>
      </Form>
      <p className="auth-switch">Chưa có tài khoản? <Link to="/register" state={{ from }}>Tạo tài khoản</Link></p>
    </>
  );
}

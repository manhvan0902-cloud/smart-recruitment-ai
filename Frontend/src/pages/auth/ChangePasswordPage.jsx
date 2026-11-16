import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Form, Input } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { changePassword } from "../../services/authService";
import { confirmPasswordRule, newPasswordRules } from "../../utils/formRules";

export default function ChangePasswordPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(null);

  useEffect(() => {
    document.title = "Đổi mật khẩu | Smart Recruitment";
    return () => request.current?.abort();
  }, []);

  async function handleSubmit(values) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setSubmitting(true);
    setError("");

    try {
      await changePassword({ oldPassword: values.oldPassword, newPassword: values.newPassword }, token, controller.signal);
      if (!controller.signal.aborted) {
        logout();
        navigate("/login", { replace: true, state: { passwordChanged: true } });
      }
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError.message);
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }

  return (
    <section className="account-page">
      <div className="page-heading"><h1>Đổi mật khẩu</h1><p>Sau khi đổi mật khẩu, bạn cần đăng nhập lại.</p></div>
      <Card className="password-card">
        {error && <Alert className="form-alert" type="error" role="alert" showIcon title={error} />}
        <Form name="change-password" layout="vertical" requiredMark={false} disabled={submitting} onFinish={handleSubmit} onValuesChange={() => setError("")}>
          <Form.Item name="oldPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại." }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" size="large" />
          </Form.Item>
          <Form.Item name="newPassword" label="Mật khẩu mới" rules={newPasswordRules}>
            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" placeholder="Từ 8 đến 128 ký tự" maxLength={128} size="large" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="Xác nhận mật khẩu mới" dependencies={["newPassword"]} rules={[{ required: true, message: "Vui lòng nhập lại mật khẩu mới." }, confirmPasswordRule("newPassword")]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" maxLength={128} size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} size="large">Cập nhật mật khẩu</Button>
        </Form>
      </Card>
    </section>
  );
}

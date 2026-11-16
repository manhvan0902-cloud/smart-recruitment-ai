import { useEffect, useRef, useState } from "react";
import { Alert, Button, Form, Input, Segmented } from "antd";
import { BankOutlined, LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { registerAccount } from "../../services/authService";
import { confirmPasswordRule, emailRules, newPasswordRules } from "../../utils/formRules";

export default function RegisterPage() {
  const [role, setRole] = useState("CANDIDATE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isCompany = role === "COMPANY";

  useEffect(() => {
    document.title = "Đăng ký | Smart Recruitment";
    return () => request.current?.abort();
  }, []);

  async function handleSubmit(values) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setSubmitting(true);
    setError("");
    const email = values.email.trim();
    const body = { email, password: values.password, role };
    if (isCompany) body.company_name = values.company_name.trim();
    else body.full_name = values.full_name.trim();

    try {
      await registerAccount(body, controller.signal);
      if (!controller.signal.aborted) {
        navigate("/login", {
          replace: true,
          state: { registeredEmail: email, from: location.state?.from },
        });
      }
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setError(requestError.status === 409 ? "Email này đã được sử dụng. Hãy đăng nhập hoặc dùng email khác." : requestError.message);
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }

  return (
    <>
      <div className="auth-heading">
        <h1>Tạo tài khoản</h1>
        <p>Chọn vai trò phù hợp để bắt đầu.</p>
      </div>
      <Segmented
        className="registration-role"
        block
        size="large"
        value={role}
        disabled={submitting}
        aria-label="Vai trò đăng ký"
        options={[
          { label: "Ứng viên", value: "CANDIDATE", icon: <UserOutlined /> },
          { label: "Nhà tuyển dụng", value: "COMPANY", icon: <BankOutlined /> },
        ]}
        onChange={(value) => { setRole(value); setError(""); }}
      />
      {isCompany && <Alert className="form-alert" type="info" showIcon title="Công ty cần được xác minh trước khi đăng tin tuyển dụng." />}
      {error && <Alert className="form-alert" type="error" role="alert" showIcon title={error} />}
      <Form name="register" layout="vertical" requiredMark={false} disabled={submitting} onFinish={handleSubmit} onValuesChange={() => setError("")}>
        {isCompany ? (
          <Form.Item
            key="company"
            name="company_name"
            label="Tên công ty"
            preserve={false}
            rules={[{ required: true, whitespace: true, message: "Vui lòng nhập tên công ty." }, { max: 200, message: "Tên công ty tối đa 200 ký tự." }]}
          >
            <Input prefix={<BankOutlined />} autoComplete="organization" placeholder="Tên công ty của bạn" maxLength={200} size="large" />
          </Form.Item>
        ) : (
          <Form.Item
            key="candidate"
            name="full_name"
            label="Họ và tên"
            preserve={false}
            rules={[{ required: true, whitespace: true, message: "Vui lòng nhập họ và tên." }, { max: 150, message: "Họ và tên tối đa 150 ký tự." }]}
          >
            <Input prefix={<UserOutlined />} autoComplete="name" placeholder="Nguyễn Văn An" maxLength={150} size="large" />
          </Form.Item>
        )}
        <Form.Item name="email" label="Email" rules={emailRules}>
          <Input prefix={<MailOutlined />} autoComplete="username" inputMode="email" placeholder="ban@example.com" maxLength={254} size="large" />
        </Form.Item>
        <Form.Item name="password" label="Mật khẩu" rules={newPasswordRules}>
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" placeholder="Từ 8 đến 128 ký tự" maxLength={128} size="large" />
        </Form.Item>
        <Form.Item name="confirmPassword" label="Xác nhận mật khẩu" dependencies={["password"]} rules={[{ required: true, message: "Vui lòng nhập lại mật khẩu." }, confirmPasswordRule("password")]}>
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" placeholder="Nhập lại mật khẩu" maxLength={128} size="large" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={submitting}>Tạo tài khoản</Button>
      </Form>
      <p className="auth-switch">Đã có tài khoản? <Link to="/login" state={{ from: location.state?.from }}>Đăng nhập</Link></p>
    </>
  );
}

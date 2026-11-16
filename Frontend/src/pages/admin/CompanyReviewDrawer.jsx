import { useEffect, useRef, useState } from "react";
import { Alert, App, Button, Descriptions, Drawer, Form, Input, Modal, Space } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import StatusTag from "../../components/StatusTag";
import { verifyCompany } from "../../services/adminService";
import { formatDateTime, getWebsiteUrl } from "../../utils/format";

export default function CompanyReviewDrawer({ company, onClose, onVerified }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [decision, setDecision] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef(null);

  useEffect(() => () => operation.current?.abort(), []);

  function openDecision(status) {
    if (operation.current) return;
    form.resetFields();
    setError("");
    setDecision(status);
  }

  function closeDecision() {
    if (operation.current) return;
    setDecision(null);
    setError("");
  }

  function closeDrawer() {
    if (operation.current || decision) return;
    setDecision(null);
    setError("");
    onClose();
  }

  async function handleSubmit(values) {
    if (operation.current || !company || !decision) return;
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    setError("");
    try {
      const result = await verifyCompany(company.id, {
        status: decision,
        note: values.note?.trim() || null,
      }, controller.signal);
      if (controller.signal.aborted) return;
      onVerified(result.data);
      message.success(decision === "VERIFIED" ? "Đã xác minh công ty." : "Đã từ chối hồ sơ công ty.");
      setDecision(null);
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError.message);
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  const website = getWebsiteUrl(company?.website);
  const details = company ? [
    { key: "name", label: "Tên công ty", children: company.name },
    { key: "verification", label: "Xác minh", children: <StatusTag status={company.verification_status} /> },
    { key: "account", label: "Email tài khoản", children: company.user?.email || "—" },
    { key: "account-status", label: "Trạng thái tài khoản", children: <StatusTag status={company.user?.status} /> },
    { key: "industry", label: "Ngành nghề", children: company.industry?.name || "—" },
    { key: "location", label: "Địa điểm", children: company.location?.name || "—" },
    { key: "address", label: "Địa chỉ", children: company.address || "—" },
    { key: "size", label: "Quy mô", children: company.company_size || "—" },
    { key: "email", label: "Email liên hệ", children: company.contact_email || "—" },
    { key: "website", label: "Website", children: website
      ? <a href={website} target="_blank" rel="noopener noreferrer">{company.website}</a> : company.website || "—" },
    { key: "created", label: "Ngày tạo hồ sơ", children: formatDateTime(company.created_at) },
    { key: "verified", label: "Ngày xác minh", children: formatDateTime(company.verified_at) },
    { key: "note", label: "Ghi chú xác minh", children: <span className="preserve-text">{company.verification_note || "—"}</span> },
  ] : [];

  return (
    <>
      <Drawer
        title="Hồ sơ công ty"
        open={Boolean(company)}
        size="min(680px, 100vw)"
        onClose={closeDrawer}
        closable={!saving && !decision}
        mask={{ closable: !saving && !decision }}
        keyboard={!saving && !decision}
        footer={company && (
          <Space wrap>
            <Button type="primary" icon={<CheckOutlined />} onClick={() => openDecision("VERIFIED")}
              disabled={saving || company.verification_status === "VERIFIED"}>Xác minh công ty</Button>
            <Button danger icon={<CloseOutlined />} onClick={() => openDecision("REJECTED")}
              disabled={saving || company.verification_status === "REJECTED"}>Từ chối</Button>
          </Space>
        )}
      >
        {company?.user?.status === "LOCKED" && <Alert className="form-alert" type="warning" showIcon
          title="Tài khoản công ty đang bị khóa. Tin tuyển dụng chỉ hiển thị khi tài khoản hoạt động và công ty đã được xác minh." />}
        <Descriptions className="company-review-details" bordered size="small" column={1} items={details} />
        {company && <div className="company-description"><h2>Giới thiệu công ty</h2><p className="preserve-text">{company.description || "Công ty chưa bổ sung phần giới thiệu."}</p></div>}
        {/* Keep the dialog inside the Drawer context so it stacks above the profile. */}
        <Modal
          title={decision === "REJECTED" ? "Từ chối hồ sơ công ty" : "Xác minh công ty"}
          open={Boolean(decision)}
          onCancel={closeDecision}
          onOk={() => form.submit()}
          okText={decision === "REJECTED" ? "Từ chối hồ sơ" : "Xác nhận xác minh"}
          cancelText="Hủy"
          confirmLoading={saving}
          okButtonProps={{ danger: decision === "REJECTED" }}
          cancelButtonProps={{ disabled: saving }}
          closable={!saving}
          mask={{ closable: !saving }}
          keyboard={!saving}
          forceRender
        >
          <p className="modal-subject">{company?.name}</p>
          {error && <Alert className="form-alert" type="error" showIcon role="alert" title={error} />}
          <Form form={form} name="company-verification" layout="vertical" disabled={saving} onFinish={handleSubmit} onValuesChange={() => setError("")}>
            <Form.Item name="note" label={decision === "REJECTED" ? "Lý do từ chối" : "Ghi chú cho công ty"}
              rules={[
                { required: decision === "REJECTED", whitespace: decision === "REJECTED", message: "Vui lòng nhập lý do từ chối." },
                { max: 1000, message: "Ghi chú tối đa 1.000 ký tự." },
              ]}>
              <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} maxLength={1000} showCount
                placeholder={decision === "REJECTED" ? "Nêu rõ thông tin công ty cần bổ sung hoặc điều chỉnh" : "Ghi chú nếu cần"} />
            </Form.Item>
          </Form>
        </Modal>
      </Drawer>
    </>
  );
}

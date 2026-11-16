import { useEffect, useRef, useState } from "react";
import { Alert, App, Avatar, Button, Card, Form, Image, Input, Select, Spin, Upload } from "antd";
import { BankOutlined, DeleteOutlined, ReloadOutlined, SaveOutlined, UploadOutlined } from "@ant-design/icons";
import StatusTag from "../../components/StatusTag";
import {
  createCompanyProfile,
  deleteCompanyLogo,
  getCompanyProfile,
  getRecruiterCatalog,
  updateCompanyProfile,
  uploadCompanyLogo,
} from "../../services/recruiterService";
import { formatDateTime, getWebsiteUrl } from "../../utils/format";

function formValues(company) {
  return {
    name: company?.name || "",
    description: company?.description || "",
    industry_id: company?.industry_id == null ? undefined : String(company.industry_id),
    location_id: company?.location_id == null ? undefined : String(company.location_id),
    address: company?.address || "",
    website: company?.website || "",
    contact_email: company?.contact_email || "",
    company_size: company?.company_size || "",
  };
}

function catalogOptions(items, current) {
  const options = items.map((item) => ({ value: String(item.id), label: item.name }));
  if (current && !options.some((item) => item.value === String(current.id))) {
    options.push({ value: String(current.id), label: current.name + " (ngừng sử dụng)", disabled: true });
  }
  return options;
}

export default function CompanyProfilePage() {
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();
  const [company, setCompany] = useState(null);
  const [catalog, setCatalog] = useState({ industries: [], locations: [] });
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const operation = useRef(null);
  const name = Form.useWatch("name", form);
  const nameChanged = company && typeof name === "string" && name.trim() !== company.name;

  useEffect(() => {
    document.title = "Hồ sơ công ty | Smart Recruitment";
    return () => operation.current?.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setReady(false);
    setLoadError("");

    const profileRequest = getCompanyProfile(controller.signal).catch((error) => {
      if (error.status === 404 && error.code === "COMPANY_PROFILE_NOT_FOUND") return null;
      throw error;
    });

    Promise.all([profileRequest, getRecruiterCatalog(controller.signal)])
      .then(([profileResult, catalogResult]) => {
        if (controller.signal.aborted) return;
        const profile = profileResult?.data || null;
        setCompany(profile);
        setCatalog(catalogResult.data);
        form.resetFields();
        form.setFieldsValue(formValues(profile));
        setDirty(false);
        setActionError("");
        setReady(true);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refreshCount, form]);

  function refreshProfile() {
    if (operation.current) return;
    const refresh = () => setRefreshCount((value) => value + 1);
    if (dirty) {
      modal.confirm({
        title: "Tải lại hồ sơ công ty?",
        content: "Các thay đổi chưa lưu trong biểu mẫu sẽ được thay bằng dữ liệu mới từ máy chủ.",
        okText: "Tải lại",
        cancelText: "Giữ chỉnh sửa",
        onOk: refresh,
      });
      return;
    }
    refresh();
  }

  function validateWebsite(_, value) {
    const website = value?.trim();
    if (!website || website === company?.website?.trim() || getWebsiteUrl(website)) {
      return Promise.resolve();
    }
    return Promise.reject(new Error("Website cần bắt đầu bằng http:// hoặc https:// và có địa chỉ hợp lệ."));
  }

  async function handleSave(values) {
    if (operation.current || !ready) return;
    const body = {
      name: values.name.trim(),
      description: values.description?.trim() || null,
      industry_id: values.industry_id ? Number(values.industry_id) : null,
      location_id: values.location_id ? Number(values.location_id) : null,
      address: values.address?.trim() || null,
      website: values.website?.trim() || null,
      contact_email: values.contact_email?.trim() || null,
      company_size: values.company_size?.trim() || null,
    };

    // PATCH gửi các trường thay đổi để giữ được tham chiếu danh mục cũ.
    if (company) {
      for (const key of Object.keys(body)) {
        if (body[key] === (company[key] ?? null)) delete body[key];
      }
      if (!Object.keys(body).length) {
        message.info("Hồ sơ chưa có thay đổi cần lưu.");
        return;
      }
    }

    const controller = new AbortController();
    operation.current = controller;
    setBusy("save");
    setActionError("");
    try {
      const result = company
        ? await updateCompanyProfile(body, controller.signal)
        : await createCompanyProfile(body, controller.signal);
      if (controller.signal.aborted) return;
      setCompany(result.data);
      form.resetFields();
      form.setFieldsValue(formValues(result.data));
      setDirty(false);
      message.success("Đã lưu hồ sơ công ty.");
    } catch (error) {
      if (!controller.signal.aborted) setActionError(error.message);
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  async function handleLogoUpload(file) {
    if (operation.current || !company || !ready) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setActionError("Logo cần là ảnh JPEG, PNG hoặc WebP.");
      return;
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      setActionError("Logo cần có dung lượng lớn hơn 0 và tối đa 5 MB.");
      return;
    }

    const controller = new AbortController();
    operation.current = controller;
    setBusy("upload");
    setActionError("");
    try {
      const result = await uploadCompanyLogo(file, controller.signal);
      if (controller.signal.aborted) return;
      setCompany((current) => ({
        ...current,
        logo_asset_id: result.data.id,
        logo: { id: result.data.id, url: result.data.url, original_name: file.name },
      }));
      message.success("Đã cập nhật logo công ty.");
    } catch (error) {
      if (!controller.signal.aborted) setActionError(error.message);
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  async function handleLogoDelete() {
    if (operation.current || !company?.logo || !ready) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy("delete");
    setActionError("");
    try {
      await deleteCompanyLogo(controller.signal);
      if (controller.signal.aborted) return;
      setCompany((current) => ({ ...current, logo_asset_id: null, logo: null }));
      message.success("Đã gỡ logo công ty.");
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error.code === "LOGO_CLEANUP_FAILED" || error.code === "COMPANY_LOGO_NOT_FOUND") {
        setCompany((current) => ({ ...current, logo_asset_id: null, logo: null }));
      }
      setActionError(error.message);
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  function confirmLogoDelete() {
    modal.confirm({
      title: "Gỡ logo công ty?",
      content: "Logo hiện tại sẽ được gỡ khỏi hồ sơ công ty.",
      okText: "Gỡ logo",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: handleLogoDelete,
    });
  }

  const disabled = Boolean(busy) || !ready;
  const verificationType = { VERIFIED: "success", PENDING: "info", REJECTED: "warning" };
  const verificationText = {
    VERIFIED: "Công ty đã được xác minh và có thể đăng tin tuyển dụng.",
    PENDING: "Hồ sơ công ty đang chờ quản trị viên xác minh.",
    REJECTED: "Hồ sơ công ty bị từ chối. Hãy cập nhật thông tin theo ghi chú của quản trị viên.",
  };

  return (
    <section>
      <div className="page-heading page-heading-with-actions">
        <div><h1>Hồ sơ công ty</h1><p>Cập nhật thông tin để ứng viên hiểu rõ về công ty của bạn.</p></div>
        <Button icon={<ReloadOutlined />} onClick={refreshProfile} disabled={loading || Boolean(busy)}>Tải lại hồ sơ</Button>
      </div>
      {loadError && (
        <Alert className="form-alert" type="error" showIcon role="alert" title="Chưa tải được hồ sơ công ty" description={loadError}
          action={<Button onClick={refreshProfile}>Thử lại</Button>} />
      )}
      {ready && company && (
        <Alert className="form-alert" type={verificationType[company.verification_status] || "info"} showIcon
          title={verificationText[company.verification_status]}
          description={company.verification_note ? <span className="preserve-text">Ghi chú của quản trị viên — {company.verification_note}</span> : undefined} />
      )}
      {ready && !company && <Alert className="form-alert" type="info" showIcon title="Hãy lưu thông tin bên dưới để tạo hồ sơ công ty." />}
      {actionError && <Alert className="form-alert" type="error" showIcon role="alert" title={actionError} />}
      <Spin spinning={loading}>
        <div className="company-profile-grid">
          <Card title="Thông tin công ty" className="company-form-card">
            <Form form={form} name="company-profile" layout="vertical" requiredMark={false} disabled={disabled}
              onFinish={handleSave} onValuesChange={() => setDirty(true)}>
              <Form.Item name="name" label="Tên công ty" rules={[
                { required: true, whitespace: true, message: "Vui lòng nhập tên công ty." },
                { max: 200, message: "Tên công ty tối đa 200 ký tự." },
              ]}>
                <Input maxLength={200} autoComplete="organization" placeholder="Tên đầy đủ của công ty" />
              </Form.Item>
              {nameChanged && <Alert className="form-alert" type="warning" showIcon title="Đổi tên sẽ đưa hồ sơ về chờ xác minh. Tin tuyển dụng sẽ tạm ngừng hiển thị cho đến khi công ty được xác minh lại." />}
              <div className="form-grid">
                <Form.Item name="industry_id" label="Ngành nghề">
                  <Select allowClear showSearch optionFilterProp="label" placeholder="Chọn ngành nghề"
                    options={catalogOptions(catalog.industries, company?.industry)} />
                </Form.Item>
                <Form.Item name="location_id" label="Địa điểm">
                  <Select allowClear showSearch optionFilterProp="label" placeholder="Chọn tỉnh / thành phố"
                    options={catalogOptions(catalog.locations, company?.location)} />
                </Form.Item>
              </div>
              <Form.Item name="address" label="Địa chỉ" rules={[{ max: 300, message: "Địa chỉ tối đa 300 ký tự." }]}>
                <Input maxLength={300} autoComplete="street-address" placeholder="Số nhà, đường, quận / huyện" />
              </Form.Item>
              <div className="form-grid">
                <Form.Item name="contact_email" label="Email liên hệ" rules={[
                  { type: "email", transform: (value) => value?.trim() || undefined, message: "Email liên hệ không hợp lệ." },
                  { max: 254, message: "Email tối đa 254 ký tự." },
                ]}>
                  <Input maxLength={254} autoComplete="email" inputMode="email" placeholder="hr@congty.com" />
                </Form.Item>
                <Form.Item name="company_size" label="Quy mô công ty" rules={[{ max: 50, message: "Quy mô tối đa 50 ký tự." }]}>
                  <Input maxLength={50} placeholder="Ví dụ 11–50 nhân viên" />
                </Form.Item>
              </div>
              <Form.Item name="website" label="Website" rules={[
                { max: 500, message: "Website tối đa 500 ký tự." },
                { validator: validateWebsite },
              ]}>
                <Input maxLength={500} autoComplete="url" placeholder="https://congty.com" />
              </Form.Item>
              <Form.Item name="description" label="Giới thiệu công ty" rules={[{ max: 65535, message: "Giới thiệu tối đa 65.535 ký tự." }]}>
                <Input.TextArea autoSize={{ minRows: 5, maxRows: 12 }} maxLength={65535} placeholder="Lĩnh vực hoạt động, môi trường làm việc và thông tin dành cho ứng viên" />
              </Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={busy === "save"} disabled={disabled}>Lưu hồ sơ</Button>
            </Form>
          </Card>
          <div className="company-side-panel">
            <Card title="Logo công ty">
              <div className="company-logo-preview">
                {company?.logo?.url ? <Image src={company.logo.url} alt={"Logo " + company.name} width={120} height={120} />
                  : <Avatar shape="square" size={120} icon={<BankOutlined />} className="company-logo-placeholder" />}
              </div>
              <p className="field-help">Ảnh JPEG, PNG hoặc WebP, tối đa 5 MB.</p>
              <div className="logo-actions">
                <Upload accept="image/jpeg,image/png,image/webp" showUploadList={false} disabled={disabled || !company}
                  beforeUpload={(file) => { void handleLogoUpload(file); return false; }}>
                  <Button icon={<UploadOutlined />} loading={busy === "upload"} disabled={disabled || !company}>
                    {company?.logo ? "Thay logo" : "Tải logo"}
                  </Button>
                </Upload>
                {company?.logo && <Button danger icon={<DeleteOutlined />} onClick={confirmLogoDelete} loading={busy === "delete"} disabled={disabled}>Gỡ logo</Button>}
              </div>
              {ready && !company && <p className="field-help">Lưu hồ sơ trước khi tải logo.</p>}
            </Card>
            {ready && company && (
              <Card title="Xác minh công ty">
                <StatusTag status={company.verification_status} />
                <dl className="company-meta">
                  <div><dt>Ngày tạo hồ sơ</dt><dd>{formatDateTime(company.created_at)}</dd></div>
                  {company.verified_at && <div><dt>Ngày xác minh</dt><dd>{formatDateTime(company.verified_at)}</dd></div>}
                </dl>
              </Card>
            )}
          </div>
        </div>
      </Spin>
    </section>
  );
}

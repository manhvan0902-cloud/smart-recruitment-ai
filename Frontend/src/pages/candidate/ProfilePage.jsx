import { useEffect, useRef, useState } from "react";
import { Alert, App, Button, Card, Form, Input, InputNumber, Select, Spin, Tabs } from "antd";
import { ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { profileSections } from "../../config/profileSections";
import { useAuth } from "../../contexts/AuthContext";
import { getCandidateCatalog, getCandidateProfile, saveCandidateProfile } from "../../services/candidateService";
import { catalogOptions, workModeLabels } from "../../utils/jobs";
import ProfileRecordsSection from "./ProfileRecordsSection";
import ProfileSkillsSection from "./ProfileSkillsSection";

function profileValues(profile) {
  const values = {};
  for (const field of ["full_name", "phone", "headline", "summary"]) values[field] = profile?.[field] || "";
  for (const field of ["location_id", "desired_location_id", "desired_industry_id", "desired_employment_type_id"]) {
    values[field] = profile?.[field] == null ? undefined : String(profile[field]);
  }
  values.desired_work_mode = profile?.desired_work_mode || undefined;
  values.desired_salary_min = profile?.desired_salary_min ?? null;
  return values;
}

function profileBody(values) {
  const body = {};
  for (const field of ["full_name", "phone", "headline", "summary"]) body[field] = values[field]?.trim() || null;
  for (const field of ["location_id", "desired_location_id", "desired_industry_id", "desired_employment_type_id"]) {
    body[field] = values[field] ? Number(values[field]) : null;
  }
  body.desired_work_mode = values.desired_work_mode || null;
  body.desired_salary_min = values.desired_salary_min == null ? null : String(values.desired_salary_min);
  return body;
}

export default function ProfilePage() {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const { message, modal } = App.useApp();
  const [profile, setProfile] = useState(null);
  const [catalog, setCatalog] = useState({ locations: [], industries: [], employmentTypes: [], skills: [] });
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const operation = useRef(null);
  const confirmation = useRef(null);

  useEffect(() => {
    document.title = "Hồ sơ cá nhân | Smart Recruitment";
    return () => { operation.current?.abort(); confirmation.current?.destroy(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setReady(false);
    setLoadError("");
    const profileRequest = getCandidateProfile(controller.signal).catch((requestError) => {
      if (requestError.code === "PROFILE_NOT_FOUND") return null;
      throw requestError;
    });
    Promise.all([profileRequest, getCandidateCatalog(controller.signal)])
      .then(([profileResult, catalogResult]) => {
        if (controller.signal.aborted) return;
        setProfile(profileResult?.data || null);
        setCatalog(catalogResult.data);
        form.resetFields();
        form.setFieldsValue(profileValues(profileResult?.data));
        setDirty(false);
        setError("");
        setReady(true);
      })
      .catch((requestError) => { if (!controller.signal.aborted) setLoadError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refreshCount, form]);

  function reloadProfile() {
    if (operation.current) return;
    const reload = () => setRefreshCount((value) => value + 1);
    if (dirty) {
      confirmation.current = modal.confirm({ title: "Tải lại thông tin cá nhân?", content: "Các thay đổi chưa lưu ở phần thông tin chung sẽ được thay bằng dữ liệu trên máy chủ.",
        okText: "Tải lại", cancelText: "Giữ chỉnh sửa", onOk: reload });
    } else reload();
  }

  async function handleSave(values) {
    if (operation.current || !ready) return;
    const body = profileBody(values);
    if (profile) {
      const original = profileBody(profileValues(profile));
      for (const field of Object.keys(body)) {
        if (body[field] === original[field]) delete body[field];
      }
      if (!Object.keys(body).length) { setDirty(false); message.info("Thông tin cá nhân chưa có thay đổi."); return; }
    }
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    setError("");
    try {
      const result = await saveCandidateProfile(body, !profile, controller.signal);
      if (controller.signal.aborted) return;
      setProfile((current) => ({ ...current, ...result.data }));
      form.resetFields();
      form.setFieldsValue(profileValues(result.data));
      setDirty(false);
      message.success("Đã lưu thông tin cá nhân.");
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError.message);
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  function referenceOptions(items, field, association) {
    const current = profile?.[association];
    return catalogOptions(items, current && String(current.id) === String(profile?.[field]) ? current : null);
  }

  const general = (
    <Spin spinning={loading}>
      {loadError && <Alert className="form-alert" type="error" showIcon role="alert" title={loadError} action={<Button onClick={reloadProfile}>Thử lại</Button>} />}
      {ready && !profile && <Alert className="form-alert" type="info" showIcon title="Lưu thông tin chung để tạo hồ sơ trước khi bổ sung học vấn, kinh nghiệm và kỹ năng." />}
      {error && <Alert className="form-alert" type="error" showIcon role="alert" title={error} />}
      <Form form={form} name="candidate-profile" layout="vertical" requiredMark={false} disabled={!ready || saving} onFinish={handleSave} onValuesChange={() => setDirty(true)}>
        <div className="form-grid">
          <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true, whitespace: true, message: "Nhập họ và tên." }, { max: 150, message: "Họ và tên tối đa 150 ký tự." }]}>
            <Input maxLength={150} autoComplete="name" />
          </Form.Item>
          <Form.Item label="Email tài khoản"><Input value={user.email} disabled /></Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ max: 30, message: "Số điện thoại tối đa 30 ký tự." }]}><Input maxLength={30} autoComplete="tel" inputMode="tel" /></Form.Item>
          <Form.Item name="location_id" label="Địa điểm hiện tại"><Select allowClear showSearch optionFilterProp="label" placeholder="Chọn địa điểm"
            options={referenceOptions(catalog.locations, "location_id", "location")} /></Form.Item>
        </div>
        <Form.Item name="headline" label="Tiêu đề nghề nghiệp" rules={[{ max: 200, message: "Tiêu đề tối đa 200 ký tự." }]}><Input maxLength={200} placeholder="Ví dụ Lập trình viên Node.js" /></Form.Item>
        <Form.Item name="summary" label="Giới thiệu bản thân" rules={[{ max: 65535, message: "Giới thiệu tối đa 65.535 ký tự." }]}><Input.TextArea maxLength={65535} autoSize={{ minRows: 4, maxRows: 12 }} /></Form.Item>
        <h2 className="form-section-title">Mong muốn công việc</h2>
        <div className="form-grid">
          <Form.Item name="desired_location_id" label="Địa điểm mong muốn"><Select allowClear showSearch optionFilterProp="label" placeholder="Chọn địa điểm"
            options={referenceOptions(catalog.locations, "desired_location_id", "desiredLocation")} /></Form.Item>
          <Form.Item name="desired_industry_id" label="Ngành nghề mong muốn"><Select allowClear showSearch optionFilterProp="label" placeholder="Chọn ngành nghề"
            options={referenceOptions(catalog.industries, "desired_industry_id", "desiredIndustry")} /></Form.Item>
          <Form.Item name="desired_employment_type_id" label="Loại việc mong muốn"><Select allowClear placeholder="Chọn loại việc"
            options={referenceOptions(catalog.employmentTypes, "desired_employment_type_id", "desiredEmploymentType")} /></Form.Item>
          <Form.Item name="desired_work_mode" label="Hình thức làm việc"><Select allowClear placeholder="Chọn hình thức"
            options={Object.entries(workModeLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
          <Form.Item name="desired_salary_min" label="Lương mong muốn tối thiểu (VND/tháng)"><InputNumber stringMode min="0" max="9999999999999.99" precision={2} className="full-width" /></Form.Item>
        </div>
        <div className="job-skill-actions"><Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} disabled={!ready}>Lưu thông tin</Button>
          <Button icon={<ReloadOutlined />} onClick={reloadProfile} disabled={loading || saving}>Tải lại thông tin</Button></div>
      </Form>
    </Spin>
  );

  const items = [{ key: "general", label: "Thông tin chung", children: general }];
  for (const [resource, section] of Object.entries(profileSections)) {
    items.push({ key: resource, label: section.label, disabled: !profile || !ready, children: <ProfileRecordsSection resource={resource} /> });
  }
  items.push({ key: "skills", label: "Kỹ năng", disabled: !profile || !ready, children: <ProfileSkillsSection catalog={catalog} /> });

  return <section><div className="page-heading"><h1>Hồ sơ cá nhân</h1><p>Thông tin đã lưu được chụp lại cùng CV khi bạn gửi hồ sơ ứng tuyển.</p></div>
    <Card className="profile-tabs-card"><Tabs items={items} defaultActiveKey="general" /></Card></section>;
}

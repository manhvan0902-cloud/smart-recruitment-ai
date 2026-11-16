import { useEffect, useRef, useState } from "react";
import { Alert, App, Button, Form, Input, Select } from "antd";
import { DeleteOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { proficiencyLabels } from "../../config/profileSections";
import { getCandidateSkills, saveCandidateSkills } from "../../services/candidateService";
import { catalogOptions } from "../../utils/jobs";

export default function ProfileSkillsSection({ catalog }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const operation = useRef(null);
  useEffect(() => () => operation.current?.abort(), []);

  function applySkills(rows) {
    setSkills(rows);
    form.resetFields();
    form.setFieldsValue({ skills: rows.map((row) => ({ skillId: String(row.skill_id), proficiency: row.proficiency || undefined, evidence: row.evidence || "" })) });
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setReady(false);
    setError("");
    getCandidateSkills(controller.signal)
      .then((result) => { if (!controller.signal.aborted) { applySkills(result.data); setReady(true); } })
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refreshCount]);

  async function handleSave(values) {
    if (operation.current || !ready) return;
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    setError("");
    try {
      const body = (values.skills || []).map((item) => ({ skillId: item.skillId, proficiency: item.proficiency || null, evidence: item.evidence?.trim() || null }));
      const result = await saveCandidateSkills(body, controller.signal);
      if (controller.signal.aborted) return;
      applySkills(result.data);
      message.success("Đã lưu kỹ năng cá nhân.");
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError.message);
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  const options = catalogOptions(catalog.skills);
  for (const row of skills) {
    if (!options.some((option) => option.value === String(row.skill_id))) {
      options.push({ value: String(row.skill_id), label: (row.skill?.name || "Kỹ năng đã lưu") + " (ngừng sử dụng)", disabled: true });
    }
  }

  return (
    <>
      <div className="section-toolbar"><h2>Kỹ năng cá nhân</h2></div>
      {error && <Alert className="form-alert" type="error" showIcon role="alert" title={error}
        action={loading || saving ? undefined : <Button onClick={() => setRefreshCount((value) => value + 1)}>Tải lại</Button>} />}
      <Form form={form} name="candidate-skills" layout="vertical" requiredMark={false} disabled={!ready || saving} onFinish={handleSave}>
        <Form.List name="skills" rules={[{ validator: (_, rows = []) => {
          const ids = rows.map((row) => row?.skillId).filter(Boolean);
          return new Set(ids).size === ids.length ? Promise.resolve() : Promise.reject(new Error("Danh sách có kỹ năng bị trùng."));
        } }]}>
          {(fields, { add, remove }, { errors }) => <>
            {fields.map((field) => <div className="profile-skill-card" key={field.key}>
              <div className="form-grid">
                <Form.Item name={[field.name, "skillId"]} label="Kỹ năng" rules={[{ required: true, message: "Chọn kỹ năng." }]}>
                  <Select showSearch optionFilterProp="label" options={options} placeholder="Chọn kỹ năng" />
                </Form.Item>
                <Form.Item name={[field.name, "proficiency"]} label="Mức độ">
                  <Select allowClear placeholder="Chọn mức độ" options={Object.entries(proficiencyLabels).map(([value, label]) => ({ value, label }))} />
                </Form.Item>
              </div>
              <Form.Item name={[field.name, "evidence"]} label="Bằng chứng / Dự án liên quan" rules={[{ max: 65535, message: "Bằng chứng tối đa 65.535 ký tự." }]}>
                <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} maxLength={65535} />
              </Form.Item>
              <Button danger icon={<DeleteOutlined />} disabled={!ready || saving} onClick={() => remove(field.name)}>Bỏ kỹ năng</Button>
            </div>)}
            <Form.ErrorList errors={errors} />
            <div className="job-skill-actions">
              <Button icon={<PlusOutlined />} disabled={!ready || saving} onClick={() => add({})}>Thêm kỹ năng</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} disabled={!ready}>Lưu kỹ năng</Button>
            </div>
          </>}
        </Form.List>
      </Form>
    </>
  );
}

import { useEffect } from "react";
import { Button, Form, InputNumber, Select, Switch } from "antd";
import { DeleteOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { catalogOptions } from "../../utils/jobs";

export default function JobSkillsForm({ job, catalog, disabled, saving, conflict, onSave, onDirty }) {
  const [form] = Form.useForm();
  const options = catalogOptions(catalog.skills);
  for (const skill of job.skills || []) {
    if (!options.some((item) => item.value === String(skill.id))) {
      options.push({ value: String(skill.id), label: skill.name + " (ngừng sử dụng)", disabled: true });
    }
  }

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue({ skills: (job.skills || []).map((skill) => ({
      skillId: String(skill.id),
      isRequired: skill.Job_skill?.is_required ?? true,
      importance: skill.Job_skill?.importance ?? 1,
    })) });
    onDirty(false);
  }, [job.skills, form, onDirty]);

  return (
    <Form form={form} name="job-skills" layout="vertical" disabled={disabled} onFinish={(values) => onSave(values.skills || [])} onValuesChange={() => onDirty(true)}>
      <p className="section-help">Chọn kỹ năng, đánh dấu bắt buộc và đặt mức quan trọng từ 1 đến 5. Để đăng tin, cần ít nhất một kỹ năng bắt buộc đang hoạt động.</p>
      <Form.List name="skills" rules={[{ validator: (_, skills = []) => {
        const ids = skills.map((skill) => skill?.skillId).filter(Boolean);
        if (new Set(ids).size !== ids.length) return Promise.reject(new Error("Danh sách có kỹ năng bị trùng."));
        return Promise.resolve();
      } }]}>
        {(fields, { add, remove }, { errors }) => (
          <>
            {fields.map((field) => (
              <div className="job-skill-row" key={field.key}>
                <Form.Item name={[field.name, "skillId"]} label="Kỹ năng" rules={[{ required: true, message: "Chọn kỹ năng." }]}>
                  <Select showSearch optionFilterProp="label" placeholder="Chọn kỹ năng" options={options} />
                </Form.Item>
                <Form.Item name={[field.name, "isRequired"]} label="Bắt buộc" valuePropName="checked"><Switch /></Form.Item>
                <Form.Item name={[field.name, "importance"]} label="Quan trọng" rules={[{ required: true, message: "Nhập mức 1–5." }]}>
                  <InputNumber min={1} max={5} precision={0} className="full-width" />
                </Form.Item>
                <Button danger type="text" icon={<DeleteOutlined />} disabled={disabled} aria-label="Bỏ kỹ năng"
                  onClick={() => { remove(field.name); onDirty(true); }} />
              </div>
            ))}
            <Form.ErrorList errors={errors} />
            <div className="job-skill-actions">
              <Button icon={<PlusOutlined />} disabled={disabled || fields.length >= 100}
                onClick={() => { add({ isRequired: true, importance: 1 }); onDirty(true); }}>Thêm kỹ năng</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} disabled={disabled || conflict}>Lưu kỹ năng</Button>
            </div>
          </>
        )}
      </Form.List>
    </Form>
  );
}

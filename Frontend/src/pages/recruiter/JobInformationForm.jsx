import { Button, Form, Input, InputNumber, Select, Switch } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { catalogOptions, jobFormValues, validDeadline, workModeLabels } from "../../utils/jobs";

export default function JobInformationForm({ form, job, catalog, disabled, saving, conflict, onSave, onDirty }) {
  const negotiable = Form.useWatch("salary_negotiable", form) ?? true;

  function handleChange(changed) {
    onDirty(true);
    if (changed.salary_negotiable === true) form.setFieldsValue({ salary_min: null, salary_max: null });
  }

  return (
    <Form form={form} name="job-information" layout="vertical" requiredMark={false}
      initialValues={jobFormValues(null)} disabled={disabled} onFinish={onSave} onValuesChange={handleChange}>
      <h2 className="form-section-title">Thông tin vị trí</h2>
      <Form.Item name="title" label="Tiêu đề công việc" rules={[
        { required: true, whitespace: true, message: "Vui lòng nhập tiêu đề công việc." },
        { max: 200, message: "Tiêu đề tối đa 200 ký tự." },
      ]}><Input maxLength={200} placeholder="Ví dụ Fresher Node.js Developer" /></Form.Item>
      <div className="form-grid">
        <Form.Item name="industry_id" label="Ngành nghề">
          <Select allowClear showSearch optionFilterProp="label" placeholder="Chọn ngành nghề" options={catalogOptions(catalog.industries, job?.industry)} />
        </Form.Item>
        <Form.Item name="level_id" label="Cấp bậc">
          <Select allowClear showSearch optionFilterProp="label" placeholder="Chọn cấp bậc" options={catalogOptions(catalog.jobLevels, job?.level)} />
        </Form.Item>
        <Form.Item name="employment_type_id" label="Loại việc làm">
          <Select allowClear placeholder="Chọn loại việc làm" options={catalogOptions(catalog.employmentTypes, job?.employmentType)} />
        </Form.Item>
        <Form.Item name="work_mode" label="Hình thức làm việc" rules={[{ required: true, message: "Chọn hình thức làm việc." }]}>
          <Select options={Object.entries(workModeLabels).map(([value, label]) => ({ value, label }))} />
        </Form.Item>
        <Form.Item name="location_id" label="Tỉnh / thành phố">
          <Select allowClear showSearch optionFilterProp="label" placeholder="Chọn địa điểm" options={catalogOptions(catalog.locations, job?.location)} />
        </Form.Item>
        <Form.Item name="vacancies" label="Số lượng tuyển" rules={[{ required: true, message: "Nhập số lượng tuyển." }]}>
          <InputNumber min={1} max={4294967295} precision={0} className="full-width" />
        </Form.Item>
      </div>
      <Form.Item name="address" label="Địa chỉ làm việc" rules={[{ max: 300, message: "Địa chỉ tối đa 300 ký tự." }]}>
        <Input maxLength={300} placeholder="Địa chỉ cụ thể nếu làm tại văn phòng hoặc kết hợp" />
      </Form.Item>
      <h2 className="form-section-title">Nội dung tuyển dụng</h2>
      <Form.Item name="description" label="Mô tả công việc" rules={[{ max: 65535, message: "Mô tả tối đa 65.535 ký tự." }]}>
        <Input.TextArea autoSize={{ minRows: 5, maxRows: 16 }} maxLength={65535} placeholder="Các nhiệm vụ và trách nhiệm của vị trí" />
      </Form.Item>
      <Form.Item name="requirements" label="Yêu cầu ứng viên" rules={[{ max: 65535, message: "Yêu cầu tối đa 65.535 ký tự." }]}>
        <Input.TextArea autoSize={{ minRows: 4, maxRows: 16 }} maxLength={65535} placeholder="Kiến thức, kinh nghiệm và các yêu cầu khác" />
      </Form.Item>
      <Form.Item name="benefits" label="Quyền lợi" rules={[{ max: 65535, message: "Quyền lợi tối đa 65.535 ký tự." }]}>
        <Input.TextArea autoSize={{ minRows: 4, maxRows: 12 }} maxLength={65535} placeholder="Chế độ đãi ngộ và môi trường làm việc" />
      </Form.Item>
      <h2 className="form-section-title">Lương và điều kiện</h2>
      <Form.Item name="salary_negotiable" label="Lương thương lượng" valuePropName="checked"><Switch /></Form.Item>
      {!negotiable && (
        <div className="form-grid">
          <Form.Item name="salary_min" label="Lương tối thiểu (VND/tháng)" rules={[{ required: true, message: "Nhập lương tối thiểu." }]}>
            <InputNumber stringMode min="0" max="9999999999999.99" precision={2} className="full-width" placeholder="9000000" />
          </Form.Item>
          <Form.Item name="salary_max" label="Lương tối đa (VND/tháng)" dependencies={["salary_min"]} rules={[
            { required: true, message: "Nhập lương tối đa." },
            ({ getFieldValue }) => ({ validator(_, value) {
              const minimum = getFieldValue("salary_min");
              if (value == null || minimum == null || Number(value) >= Number(minimum)) return Promise.resolve();
              return Promise.reject(new Error("Lương tối đa phải từ lương tối thiểu trở lên."));
            } }),
          ]}>
            <InputNumber stringMode min="0" max="9999999999999.99" precision={2} className="full-width" placeholder="14000000" />
          </Form.Item>
        </div>
      )}
      <div className="form-grid">
        <Form.Item name="min_experience_months" label="Kinh nghiệm tối thiểu (tháng)" rules={[{ required: true, message: "Nhập số tháng kinh nghiệm, dùng 0 nếu chưa yêu cầu." }]}>
          <InputNumber min={0} max={4294967295} precision={0} className="full-width" />
        </Form.Item>
        <Form.Item name="education_requirement" label="Yêu cầu học vấn" rules={[{ max: 200, message: "Yêu cầu học vấn tối đa 200 ký tự." }]}>
          <Input maxLength={200} placeholder="Ví dụ Đại học hoặc tương đương" />
        </Form.Item>
      </div>
      <Form.Item name="application_deadline" label="Hạn nộp hồ sơ (giờ Việt Nam)" rules={[
        { validator: (_, value) => validDeadline(value) ? Promise.resolve() : Promise.reject(new Error("Hạn nộp không phải ngày giờ hợp lệ.")) },
      ]}>
        <Input type="datetime-local" step={60} />
      </Form.Item>
      <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} disabled={disabled || conflict}>
        {job ? "Lưu thông tin" : "Lưu tin nháp"}
      </Button>
    </Form>
  );
}

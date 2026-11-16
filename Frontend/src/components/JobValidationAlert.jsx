import { Alert } from "antd";

const fieldLabels = {
  description: "Mô tả công việc",
  requirements: "Yêu cầu ứng viên",
  industry_id: "Ngành nghề",
  location_id: "Địa điểm làm việc",
  level_id: "Cấp bậc",
  employment_type_id: "Loại việc làm",
  application_deadline: "Hạn nộp hồ sơ ở tương lai",
  address: "Địa chỉ làm việc",
  "salary_min/salary_max": "Khoảng lương hợp lệ, hoặc để trống hai mức lương khi thương lượng",
  skills: "Ít nhất một kỹ năng bắt buộc đang hoạt động",
};

export default function JobValidationAlert({ fields }) {
  if (!fields?.length) return null;
  return (
    <Alert className="form-alert" type="warning" showIcon title="Kết quả kiểm tra điều kiện đăng tin gần nhất"
      description={<ul className="validation-list">{fields.map((field) => {
        const name = field.split(" (")[0];
        let label = fieldLabels[name] || field;
        if (field.includes("đã bị tắt")) label += " — cần chọn lại danh mục đang hoạt động";
        return <li key={field}>{label}</li>;
      })}</ul>} />
  );
}

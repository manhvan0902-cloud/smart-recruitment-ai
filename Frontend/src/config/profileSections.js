export const profileSections = {
  educations: {
    label: "Học vấn", singular: "học vấn", primary: "school_name", secondary: ["major", "degree"], start: "start_date", end: "end_date",
    fields: [
      { name: "school_name", label: "Trường học", required: true, max: 200 },
      { name: "major", label: "Chuyên ngành", max: 150 },
      { name: "degree", label: "Bằng cấp", max: 100 },
      { name: "start_date", label: "Ngày bắt đầu", type: "date" },
      { name: "end_date", label: "Ngày kết thúc", type: "date" },
      { name: "description", label: "Mô tả", type: "textarea", max: 65535 },
    ],
  },
  experiences: {
    label: "Kinh nghiệm", singular: "kinh nghiệm", primary: "company_name", secondary: ["job_title"], start: "start_date", end: "end_date",
    fields: [
      { name: "company_name", label: "Công ty", required: true, max: 200 },
      { name: "job_title", label: "Chức danh", required: true, max: 150 },
      { name: "start_date", label: "Ngày bắt đầu", type: "date", required: true },
      { name: "end_date", label: "Ngày kết thúc", type: "date" },
      { name: "description", label: "Mô tả công việc", type: "textarea", max: 65535 },
    ],
  },
  projects: {
    label: "Dự án", singular: "dự án", primary: "name", secondary: [], start: "start_date", end: "end_date",
    fields: [
      { name: "name", label: "Tên dự án", required: true, max: 200 },
      { name: "project_url", label: "Liên kết dự án", type: "url", max: 500 },
      { name: "start_date", label: "Ngày bắt đầu", type: "date" },
      { name: "end_date", label: "Ngày kết thúc", type: "date" },
      { name: "description", label: "Mô tả dự án", type: "textarea", max: 65535 },
    ],
  },
  certifications: {
    label: "Chứng chỉ", singular: "chứng chỉ", primary: "name", secondary: ["issuer"], start: "issued_date", end: "expires_date",
    fields: [
      { name: "name", label: "Tên chứng chỉ", required: true, max: 200 },
      { name: "issuer", label: "Đơn vị cấp", max: 200 },
      { name: "credential_url", label: "Liên kết chứng chỉ", type: "url", max: 500 },
      { name: "issued_date", label: "Ngày cấp", type: "date" },
      { name: "expires_date", label: "Ngày hết hạn", type: "date" },
    ],
  },
};

export const proficiencyLabels = { BASIC: "Cơ bản", INTERMEDIATE: "Trung bình", ADVANCED: "Nâng cao" };

export function validDateOnly(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

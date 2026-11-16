export const workModeLabels = { ONSITE: "Tại văn phòng", HYBRID: "Kết hợp", REMOTE: "Từ xa" };
export const jobStatuses = [
  { value: "DRAFT", label: "Bản nháp" },
  { value: "NEEDS_CHANGES", label: "Cần bổ sung" },
  { value: "PUBLISHED", label: "Đang đăng" },
  { value: "CLOSED", label: "Đã đóng" },
  { value: "EXPIRED", label: "Hết hạn" },
];

const salaryFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

export function formatSalary(job) {
  if (job.salary_negotiable) return "Thương lượng";
  if (job.salary_min == null || job.salary_max == null) return "Chưa bổ sung mức lương";
  return `${salaryFormatter.format(Number(job.salary_min))} – ${salaryFormatter.format(Number(job.salary_max))} VND/tháng`;
}

export function catalogOptions(items = [], current) {
  const options = items.map((item) => ({ value: String(item.id), label: item.name }));
  if (current && !options.some((item) => item.value === String(current.id))) {
    options.push({ value: String(current.id), label: current.name + " (ngừng sử dụng)", disabled: true });
  }
  return options;
}

export function toVietnamDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

export function validDeadline(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return false;
  return toVietnamDateInput(value + "+07:00") === value.slice(0, 16);
}

export function jobFormValues(job) {
  return {
    title: job?.title || "",
    description: job?.description || "",
    requirements: job?.requirements || "",
    benefits: job?.benefits || "",
    industry_id: job?.industry_id == null ? undefined : String(job.industry_id),
    location_id: job?.location_id == null ? undefined : String(job.location_id),
    level_id: job?.level_id == null ? undefined : String(job.level_id),
    employment_type_id: job?.employment_type_id == null ? undefined : String(job.employment_type_id),
    work_mode: job?.work_mode || "ONSITE",
    address: job?.address || "",
    salary_negotiable: job?.salary_negotiable ?? true,
    salary_min: job?.salary_min ?? null,
    salary_max: job?.salary_max ?? null,
    min_experience_months: job?.min_experience_months ?? 0,
    education_requirement: job?.education_requirement || "",
    vacancies: job?.vacancies ?? 1,
    application_deadline: toVietnamDateInput(job?.application_deadline),
  };
}

export function jobRequestBody(values) {
  return {
    title: values.title.trim(),
    description: values.description?.trim() || null,
    requirements: values.requirements?.trim() || null,
    benefits: values.benefits?.trim() || null,
    industry_id: values.industry_id ? Number(values.industry_id) : null,
    location_id: values.location_id ? Number(values.location_id) : null,
    level_id: values.level_id ? Number(values.level_id) : null,
    employment_type_id: values.employment_type_id ? Number(values.employment_type_id) : null,
    work_mode: values.work_mode,
    address: values.address?.trim() || null,
    salary_negotiable: Boolean(values.salary_negotiable),
    salary_min: values.salary_negotiable || values.salary_min == null ? null : String(values.salary_min),
    salary_max: values.salary_negotiable || values.salary_max == null ? null : String(values.salary_max),
    min_experience_months: values.min_experience_months,
    education_requirement: values.education_requirement?.trim() || null,
    vacancies: values.vacancies,
    application_deadline: values.application_deadline ? new Date(values.application_deadline + "+07:00").toISOString() : null,
  };
}

export function hydrateRecruiterJob(previous, saved, catalog) {
  const result = { ...previous, ...saved };
  for (const [field, association, collection] of [
    ["industry_id", "industry", "industries"],
    ["location_id", "location", "locations"],
    ["level_id", "level", "jobLevels"],
    ["employment_type_id", "employmentType", "employmentTypes"],
  ]) {
    result[association] = catalog[collection]?.find((item) => String(item.id) === String(result[field])) || null;
    if (!result[association] && String(previous?.[association]?.id) === String(result[field])) {
      result[association] = previous[association];
    }
  }
  return result;
}

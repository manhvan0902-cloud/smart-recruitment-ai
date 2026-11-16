import { Card, Descriptions, Tag } from "antd";
import { proficiencyLabels, profileSections } from "../config/profileSections";
import { formatDateOnly, getWebsiteUrl } from "../utils/format";
import { workModeLabels } from "../utils/jobs";

export default function SubmittedProfile({ profile, jobSkills = [] }) {
  const skillNames = new Map(jobSkills.map((item) => [String(item.skill_id || item.id), item.skill?.name || item.name]));
  return <div className="submitted-profile">
    <Descriptions column={1} items={[
      { key: "name", label: "Họ và tên", children: profile.full_name || "—" },
      { key: "email", label: "Email", children: profile.email || "—" },
      { key: "phone", label: "Số điện thoại", children: profile.phone || "—" },
      { key: "headline", label: "Nghề nghiệp", children: profile.headline || "—" },
      { key: "location", label: "Địa điểm hiện tại", children: profile.location?.name || "—" },
      { key: "desired-location", label: "Địa điểm mong muốn", children: profile.desiredLocation?.name || "—" },
      { key: "industry", label: "Ngành nghề mong muốn", children: profile.desiredIndustry?.name || "—" },
      { key: "type", label: "Loại việc mong muốn", children: profile.desiredEmploymentType?.name || "—" },
      { key: "mode", label: "Hình thức mong muốn", children: workModeLabels[profile.desired_work_mode] || "—" },
      { key: "salary", label: "Lương mong muốn", children: profile.desired_salary_min == null ? "—" : new Intl.NumberFormat("vi-VN").format(Number(profile.desired_salary_min)) + " VND/tháng" },
    ]} />
    {profile.summary && <p className="preserve-text job-body-text">{profile.summary}</p>}
    {Object.entries(profileSections).map(([key, section]) => {
      const records = profile[key] || [];
      if (!records.length) return null;
      return <div className="snapshot-section" key={key}><h3>{section.label}</h3>{records.map((record, index) => {
        const url = getWebsiteUrl(record.project_url || record.credential_url);
        return <Card key={record.id || index} size="small" className="snapshot-record">
          <strong>{record[section.primary]}</strong>
          <p className="table-secondary">{section.secondary.map((field) => record[field]).filter(Boolean).join(" · ")}</p>
          <p className="table-secondary">{formatDateOnly(record[section.start])} – {formatDateOnly(record[section.end])}</p>
          {record.description && <p className="preserve-text job-body-text">{record.description}</p>}
          {url && <a href={url} target="_blank" rel="noopener noreferrer">Xem liên kết</a>}
        </Card>;
      })}</div>;
    })}
    {profile.skills?.length > 0 && <div className="snapshot-section"><h3>Kỹ năng đã khai báo</h3>{profile.skills.map((item) => <div className="snapshot-skill" key={item.skill_id}>
      <div><Tag>{item.skill?.name || skillNames.get(String(item.skill_id)) || "Kỹ năng #" + item.skill_id}</Tag>
        {item.proficiency && <span className="table-secondary">{proficiencyLabels[item.proficiency] || item.proficiency}</span>}</div>
      {item.evidence && <p className="preserve-text job-body-text">{item.evidence}</p>}
    </div>)}</div>}
  </div>;
}

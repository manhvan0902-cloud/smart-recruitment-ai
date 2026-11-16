import { useEffect, useState } from "react";
import { Alert, Button, Card, Descriptions, Result, Skeleton, Tag } from "antd";
import { ArrowLeftOutlined, BankOutlined, ReloadOutlined } from "@ant-design/icons";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import SaveJobButton from "../../components/SaveJobButton";
import { getCandidateJob } from "../../services/candidateService";
import { formatDateTime, getWebsiteUrl } from "../../utils/format";
import { formatSalary, workModeLabels } from "../../utils/jobs";
import ApplyModal from "./ApplyModal";
import MatchCvPickerModal from "./MatchCvPickerModal";

export default function JobDetailsPage() {
  const { jobId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [applyOpen, setApplyOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const requestedFrom = location.state?.from;
  const from = typeof requestedFrom === "string" && (requestedFrom.startsWith("/candidate/jobs?") || requestedFrom === "/candidate/saved-jobs")
    ? requestedFrom : "/candidate/jobs";

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setJob(null);
    setApplyOpen(false);
    setMatchOpen(false);
    document.title = "Chi tiết việc làm | Smart Recruitment";
    getCandidateJob(jobId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setJob(result.data);
        document.title = result.data.title + " | Smart Recruitment";
      })
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [jobId, refreshCount]);

  if (loading) return <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>;
  if (error?.status === 404) return <Result status="warning" title="Việc làm không còn nhận hồ sơ"
    subTitle="Tin có thể đã đóng, hết hạn hoặc tạm ngừng hiển thị."
    extra={<Link to={from}><Button type="primary">Quay lại danh sách</Button></Link>} />;
  if (error) return <Alert type="error" showIcon role="alert" title={error.message}
    action={<Button onClick={() => setRefreshCount((value) => value + 1)}>Thử lại</Button>} />;
  if (!job) return null;

  const website = getWebsiteUrl(job.company?.website);
  const details = [
    { key: "salary", label: "Mức lương", children: formatSalary(job) },
    { key: "location", label: "Địa điểm", children: job.location?.name || (job.work_mode === "REMOTE" ? "Làm việc từ xa" : "—") },
    { key: "mode", label: "Hình thức", children: workModeLabels[job.work_mode] || job.work_mode },
    { key: "type", label: "Loại việc", children: job.employmentType?.name || "—" },
    { key: "level", label: "Cấp bậc", children: job.level?.name || "—" },
    { key: "industry", label: "Ngành nghề", children: job.industry?.name || "—" },
    { key: "experience", label: "Kinh nghiệm", children: Number(job.min_experience_months) === 0 ? "Chưa yêu cầu kinh nghiệm" : `${job.min_experience_months} tháng trở lên` },
    { key: "education", label: "Học vấn", children: job.education_requirement || "Chưa yêu cầu cụ thể" },
    { key: "vacancies", label: "Số lượng tuyển", children: `${job.vacancies} người` },
    { key: "deadline", label: "Hạn nộp", children: formatDateTime(job.application_deadline) },
    { key: "address", label: "Địa chỉ", children: job.address || "—" },
  ];

  return (
    <section>
      <Link className="back-link" to={from}><ArrowLeftOutlined /> Quay lại danh sách</Link>
      <Card className="job-detail-header">
        <div className="page-heading-with-actions">
          <div><h1>{job.title}</h1><p className="job-detail-company"><BankOutlined /> {job.company?.name}</p><p className="job-salary">{formatSalary(job)}</p></div>
          <div className="job-detail-actions">
            {job.application_id ? <Link to={"/candidate/applications/" + job.application_id}><Button type="primary">Xem đơn đã nộp</Button></Link>
              : <Button type="primary" onClick={() => setApplyOpen(true)}>Ứng tuyển</Button>}
            <SaveJobButton key={job.id} jobId={job.id} saved={job.is_saved}
              onChange={(saved) => setJob((current) => ({ ...current, is_saved: saved }))} />
            <Button onClick={() => setMatchOpen(true)}>Đối chiếu CV</Button>
          </div>
        </div>
      </Card>
      <div className="job-details-grid">
        <div className="job-detail-sections">
          <Card title="Thông tin vị trí"><Descriptions column={1} items={details} /></Card>
          {[["Mô tả công việc", job.description], ["Yêu cầu ứng viên", job.requirements], ["Quyền lợi", job.benefits]].map(([title, text]) => (
            <Card title={title} key={title}><p className="preserve-text job-body-text">{text || "Chưa bổ sung thông tin."}</p></Card>
          ))}
          <Card title="Kỹ năng yêu cầu"><div className="job-skills-display">
            {(job.skills || []).map((skill) => <Tag key={skill.id} color={skill.Job_skill?.is_required ? "blue" : "default"}>
              {skill.name}{skill.Job_skill?.is_required ? " · Bắt buộc" : " · Ưu tiên"}
            </Tag>)}
          </div></Card>
        </div>
        <aside><Card title="Về công ty">
          <h2 className="company-aside-title">{job.company?.name}</h2>
          {job.company?.company_size && <p>Quy mô {job.company.company_size}</p>}
          <p className="preserve-text job-body-text">{job.company?.description || "Công ty chưa bổ sung giới thiệu."}</p>
          {website && <a className="company-website" href={website} target="_blank" rel="noopener noreferrer">Website công ty</a>}
          <Button className="detail-refresh" icon={<ReloadOutlined />} onClick={() => setRefreshCount((value) => value + 1)}>Tải lại thông tin</Button>
        </Card></aside>
      </div>
      {applyOpen && <ApplyModal job={job} onClose={() => setApplyOpen(false)}
        onApplied={(application) => navigate("/candidate/applications/" + application.id)} />}
      {matchOpen && <MatchCvPickerModal job={job} onClose={() => setMatchOpen(false)} />}
    </section>
  );
}

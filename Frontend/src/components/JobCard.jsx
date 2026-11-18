import { Avatar, Button, Card } from "antd";
import { BankOutlined, ClockCircleOutlined, EnvironmentOutlined, StarOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { formatDateTime } from "../utils/format";
import { formatSalary, workModeLabels } from "../utils/jobs";
import SaveJobButton from "./SaveJobButton";
import { useAuth } from "../contexts/AuthContext";
import { getCandidateJobActionPath } from "../config/navigation";

export default function JobCard({ job, available = true, savedAt, from, onSavedChange, disabled = false, publicView = false }) {
  const { user } = useAuth();
  const title = available ? <Link to={(publicView ? "/jobs/" : "/candidate/jobs/") + job.id} state={{ from }}>{job.title}</Link> : job.title;
  return (
    <Card className="job-card">
      <div className="job-card-top">
        <div className="job-company-mark" aria-hidden="true">
          {publicView ? <Avatar shape="square" size={46} src={job.company?.logo?.url} icon={<BankOutlined />} /> : <BankOutlined />}
        </div>
        <div className="job-card-title"><h2>{title}</h2><p>
          {publicView && job.company?.id ? <Link to={"/companies/" + job.company.id}>{job.company.name}</Link> : job.company?.name || "Công ty tuyển dụng"}
        </p></div>
      </div>
      <p className="job-salary">{formatSalary(job)}</p>
      <div className="job-card-meta">
        <span><EnvironmentOutlined /> {job.location?.name || (job.work_mode === "REMOTE" ? "Làm việc từ xa" : "Chưa bổ sung địa điểm")}</span>
        <span>{workModeLabels[job.work_mode] || job.work_mode}</span>
      </div>
      <div className="job-card-bottom">
        <div className="job-dates">
          <span><ClockCircleOutlined /> Hạn nộp {formatDateTime(job.application_deadline)}</span>
          {savedAt && <span>Đã lưu {formatDateTime(savedAt)}</span>}
          {!available && <span className="job-unavailable">Tin hiện ngừng nhận hồ sơ.</span>}
        </div>
        {publicView ? ((!user || user.role === "CANDIDATE") &&
          <Link to={getCandidateJobActionPath(job.id, "save", from)}><Button icon={<StarOutlined />} disabled={disabled}>Lưu việc</Button></Link>)
          : <SaveJobButton jobId={job.id} saved={job.is_saved} disabled={disabled || (!available && !job.is_saved)} onChange={onSavedChange} />}
      </div>
    </Card>
  );
}

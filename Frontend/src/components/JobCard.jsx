import { Card } from "antd";
import { BankOutlined, ClockCircleOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { formatDateTime } from "../utils/format";
import { formatSalary, workModeLabels } from "../utils/jobs";
import SaveJobButton from "./SaveJobButton";

export default function JobCard({ job, available = true, savedAt, from, onSavedChange, disabled = false }) {
  const title = available ? <Link to={"/candidate/jobs/" + job.id} state={{ from }}>{job.title}</Link> : job.title;
  return (
    <Card className="job-card">
      <div className="job-card-top">
        <div className="job-company-mark" aria-hidden="true"><BankOutlined /></div>
        <div className="job-card-title"><h2>{title}</h2><p>{job.company?.name || "Công ty tuyển dụng"}</p></div>
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
        <SaveJobButton jobId={job.id} saved={job.is_saved} disabled={disabled || (!available && !job.is_saved)} onChange={onSavedChange} />
      </div>
    </Card>
  );
}

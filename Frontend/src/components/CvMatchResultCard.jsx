import { useState } from "react";
import { Alert, Button, Card, Collapse, Descriptions, Empty, Progress, Space, Tag } from "antd";
import { Link } from "react-router-dom";
import { formatDateTime } from "../utils/format";
import MatchTaskModal from "./MatchTaskModal";

const scoreFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
function Score({ label, value }) {
  const known = value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
  return <div className="match-score"><span>{label}</span><strong>{known ? scoreFormat.format(Number(value)) + "%" : "Chưa đủ cơ sở"}</strong>
    {known && <Progress percent={Math.max(0, Math.min(100, Number(value)))} showInfo={false} />}</div>;
}

export default function CvMatchResultCard({ result, cv }) {
  const [taskOpen, setTaskOpen] = useState(false);
  const matched = result.matched_skills || [];
  const missing = result.missing_skills || [];
  const evidence = result.evidence || [];
  const oldCv = String(result.cv_extraction_version) !== String(cv.extraction_version);
  const oldJob = result.job && String(result.job_revision) !== String(result.job.revision);
  const names = new Map(matched.map((skill) => [String(skill.skillId), skill.name]));
  return <Card className="cv-match-result">
    <div className="match-result-heading"><div><h2>{result.job?.title || "Tin tuyển dụng #" + result.job_id}</h2><span className="muted-text">Đối chiếu lúc {formatDateTime(result.created_at)}</span></div>
      <Tag color={result.evidence_status === "SUFFICIENT" ? "success" : "warning"}>{result.evidence_status === "SUFFICIENT" ? "Đủ cơ sở tính điểm tham khảo" : "Chưa đủ cơ sở tính điểm tổng"}</Tag></div>
    {(oldCv || oldJob) && <Alert className="form-alert" type="warning" showIcon title="Kết quả sử dụng dữ liệu phiên bản cũ."
      description={[oldCv && "CV đã có phiên bản văn bản khác.", oldJob && "Tin tuyển dụng đã được chỉnh sửa."].filter(Boolean).join(" ") + " Hãy đối chiếu lại nếu tin còn nhận hồ sơ."} />}
    {result.job && result.job.status !== "PUBLISHED" && <Alert className="form-alert" type="info" showIcon title="Tin tuyển dụng hiện không ở trạng thái đang đăng. Đây là kết quả đã lưu." />}
    {!matched.length && !missing.length && <Alert className="form-alert" type="info" showIcon title="Tin tuyển dụng chưa có danh sách kỹ năng để đối chiếu trong lần xử lý này." />}
    <div className="match-scores"><Score label="Điểm kỹ năng" value={result.skill_score} /><Score label="Điểm tổng tham khảo" value={result.total_score} /></div>
    <p className="job-body-text">{result.explanation}</p>
    <p className="muted-text">Chưa đánh giá kinh nghiệm. Điểm không phải kết luận tuyển dụng và không chứng minh năng lực thực tế của ứng viên.</p>
    <Collapse items={[
      { key: "matched", label: `Kỹ năng tìm thấy trong CV (${matched.length})`, children: matched.length ? <div className="match-skill-tags">{matched.map((skill) => <Tag key={skill.skillId} color="green">{skill.name}{skill.isRequired ? " · Bắt buộc" : " · Ưu tiên"} · Mức quan trọng {skill.importance}</Tag>)}</div> : <p>Chưa tìm thấy kỹ năng yêu cầu trong văn bản CV.</p> },
      { key: "missing", label: `Kỹ năng chưa tìm thấy bằng chứng (${missing.length})`, children: missing.length ? <><p className="section-help">Chưa tìm thấy tên hoặc tên gọi khác trong văn bản; điều này không có nghĩa bạn không có kỹ năng đó.</p><div className="match-skill-tags">{missing.map((skill) => <Tag key={skill.skillId} color={skill.isRequired ? "orange" : "default"}>{skill.name}{skill.isRequired ? " · Bắt buộc" : " · Ưu tiên"} · Mức quan trọng {skill.importance}</Tag>)}</div></> : <p>Không có kỹ năng yêu cầu chưa tìm thấy trong lần đối chiếu này.</p> },
      { key: "evidence", label: "Bằng chứng từ văn bản CV", children: evidence.length ? <div className="match-evidence-list">{evidence.map((item, index) => <blockquote key={String(item.skillId) + ":" + index}><strong>{names.get(String(item.skillId)) || "Kỹ năng"}</strong><p className="preserve-text">{item.text}</p></blockquote>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có bằng chứng kỹ năng." /> },
      { key: "suggestions", label: "Gợi ý bổ sung hồ sơ", children: result.suggestions?.length ? <ul className="match-suggestions">{result.suggestions.map((suggestion, index) => <li key={index}>{suggestion}</li>)}</ul> : <p>Chưa có gợi ý bổ sung.</p> },
      { key: "method", label: "Cách tính và phiên bản dữ liệu", children: <><p>So tên kỹ năng và tên gọi khác với văn bản CV. Trọng số bằng mức quan trọng; kỹ năng bắt buộc có trọng số gấp đôi. Điểm kỹ năng là tỷ lệ trọng số tìm thấy trên tổng trọng số yêu cầu.</p>
        <Descriptions column={1} size="small" items={[
          { key: "method", label: "Phương pháp", children: result.algorithm_version },
          { key: "cv", label: "Phiên bản văn bản CV", children: result.cv_extraction_version },
          { key: "job", label: "Phiên bản tin", children: result.job_revision },
          { key: "experience", label: "Điểm kinh nghiệm", children: result.experience_score == null ? "Chưa đánh giá" : scoreFormat.format(Number(result.experience_score)) + "%" },
        ]} /></> },
    ]} />
    <Space wrap className="match-result-actions"><Link to={"/candidate/jobs/" + result.job_id}><Button>Xem tin tuyển dụng</Button></Link>
      {result.task_id && <Button onClick={() => setTaskOpen(true)}>Thông tin xử lý</Button>}</Space>
    {taskOpen && <MatchTaskModal taskId={result.task_id} onClose={() => setTaskOpen(false)} />}
  </Card>;
}

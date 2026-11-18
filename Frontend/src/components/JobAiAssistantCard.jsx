import { useCallback } from "react";
import { Alert, Button, Collapse } from "antd";
import { generateJobDescription, listJobAiTasks } from "../services/aiService";
import AiAssistantCard from "./AiAssistantCard";

export default function JobAiAssistantCard({ job, disabled, onBusy, onApply }) {
  const generate = useCallback((body, signal) => generateJobDescription(job.id, body, signal), [job.id]);
  const history = useCallback((query, signal) => listJobAiTasks(job.id, query, signal), [job.id]);
  return <AiAssistantCard title="AI hỗ trợ soạn tin tuyển dụng" actionLabel="Tạo bản nháp JD" sourceVersion={job.revision} allowNotes
    description="AI soạn mô tả, yêu cầu và quyền lợi từ thông tin tin đã lưu. Bạn xem lại bản nháp rồi chọn đưa vào biểu mẫu để chỉnh sửa và lưu."
    generate={generate} loadHistory={history} disabled={disabled} onBusy={onBusy}
    renderOutput={(data, state) => ["description", "requirements", "benefits"].every((key) => typeof data[key] === "string") ? <>
      <Collapse defaultActiveKey={["description"]} items={[["description", "Mô tả công việc"], ["requirements", "Yêu cầu ứng viên"], ["benefits", "Quyền lợi"]].map(([key, label]) => ({ key, label, children: <p className="preserve-text job-body-text">{data[key]}</p> }))} />
      {Array.isArray(data.review_notes) && data.review_notes.length > 0 && <Alert className="form-alert" type="warning" showIcon title="Thông tin cần nhà tuyển dụng xác nhận"
        description={<ul>{data.review_notes.map((note, index) => <li key={index}>{note}</li>)}</ul>} />}
      <Button className="ai-apply-button" disabled={disabled || state.busy || state.oldVersion} onClick={() => onApply(data)}>Đưa bản nháp vào biểu mẫu</Button>
    </> : <Alert type="info" showIcon title="Kết quả cũ chưa có đầy đủ các phần của bản nháp JD. Hãy tạo bản nháp mới." />} />;
}

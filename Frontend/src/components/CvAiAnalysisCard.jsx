import { useCallback } from "react";
import { Alert, Collapse, Empty, Tag } from "antd";
import { analyzeCvWithAi, listCvAnalysisTasks } from "../services/aiService";
import AiAssistantCard from "./AiAssistantCard";

export default function CvAiAnalysisCard({ cv, disabled, onBusy, onChanged }) {
  const generate = useCallback((body, signal) => analyzeCvWithAi(cv.id, body, signal), [cv.id]);
  const history = useCallback((query, signal) => listCvAnalysisTasks(cv.id, query, signal), [cv.id]);
  return <AiAssistantCard title="Phân tích hồ sơ bằng AI" actionLabel="Phân tích CV bằng AI" sourceVersion={cv.extraction_version}
    description="Văn bản CV được gửi đến dịch vụ AI của hệ thống để tóm tắt kỹ năng, học vấn, kinh nghiệm và dự án. Xem lại bằng chứng trước khi dùng thông tin trong hồ sơ."
    generate={generate} loadHistory={history} disabled={disabled || Boolean(cv.archived_at) || cv.processing_status !== "READY"} onBusy={onBusy} onSettled={onChanged}
    renderOutput={(data) => <>
      <p className="preserve-text job-body-text">{typeof data.summary === "string" ? data.summary : "Lần xử lý cũ chưa có phần tóm tắt hồ sơ."}</p>
      <Alert className="form-alert" type="info" showIcon title="Kết quả phân tích được lưu cùng CV để bạn tham khảo và đối chiếu với văn bản gốc." />
      <Collapse items={[
        { key: "skills", label: `Kỹ năng (${Array.isArray(data.skills) ? data.skills.length : 0})`, children: Array.isArray(data.skills) && data.skills.length ? data.skills.map((skill, index) => <div className="ai-evidence-item" key={index}><Tag color="blue">{skill.name}</Tag><blockquote className="preserve-text">{skill.evidence}</blockquote></div>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa tìm thấy bằng chứng kỹ năng." /> },
        ...[["education", "Học vấn"], ["experience", "Kinh nghiệm"], ["projects", "Dự án"]].map(([key, label]) => ({ key, label: `${label} (${Array.isArray(data[key]) ? data[key].length : 0})`,
          children: Array.isArray(data[key]) && data[key].length ? data[key].map((item, index) => <article className="ai-evidence-item" key={index}>
            <strong>{[item.institution, item.qualification, item.organization, item.role, item.name].filter(Boolean).join(" · ")}</strong>
            {item.period && <p>{item.period}</p>}{item.description && <p className="preserve-text">{item.description}</p>}
            <blockquote className="preserve-text">{item.evidence}</blockquote></article>) : <p>Chưa có thông tin trong văn bản CV.</p>,
        })),
      ]} />
    </>} />;
}

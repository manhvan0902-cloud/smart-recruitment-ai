import { useCallback } from "react";
import { Collapse, Empty } from "antd";
import { generateInterviewQuestions, listInterviewQuestionTasks } from "../services/aiService";
import AiAssistantCard from "./AiAssistantCard";

export default function InterviewQuestionsCard({ application, disabled, onBusy }) {
  const generate = useCallback((body, signal) => generateInterviewQuestions(application.id, body, signal), [application.id]);
  const history = useCallback((query, signal) => listInterviewQuestionTasks(application.id, query, signal), [application.id]);
  return <AiAssistantCard title="AI gợi ý câu hỏi phỏng vấn" actionLabel="Tạo bộ câu hỏi" sourceVersion={application.job_revision} allowNotes
    description="Thông tin công việc và hồ sơ đã nộp được gửi đến dịch vụ AI của hệ thống để tạo câu hỏi chuyên môn, câu hỏi tình huống và gợi ý hỏi sâu. Nhà tuyển dụng xem lại trước khi sử dụng."
    generate={generate} loadHistory={history} disabled={disabled} onBusy={onBusy}
    renderOutput={(data) => Array.isArray(data.questions) && data.questions.length ? <Collapse items={data.questions.map((item, index) => ({ key: String(index), label: item.question,
      children: <><strong>Mục đích</strong><p className="preserve-text">{item.purpose}</p><strong>Gợi ý hỏi sâu</strong><p className="preserve-text">{item.suggested_follow_up}</p></> }))} />
      : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Lần xử lý cũ chưa có bộ câu hỏi để hiển thị. Bạn có thể tạo bộ câu hỏi mới." />} />;
}

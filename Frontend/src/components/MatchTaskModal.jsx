import { useEffect, useState } from "react";
import { Alert, Button, Descriptions, Modal, Skeleton, Tag } from "antd";
import { getCandidateTask } from "../services/candidateService";
import { formatDateTime } from "../utils/format";

const statuses = { QUEUED: ["Chờ xử lý", "default"], RUNNING: ["Đang xử lý", "processing"], SUCCEEDED: ["Thành công", "success"], FAILED: ["Thất bại", "error"] };

export default function MatchTaskModal({ taskId, onClose }) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getCandidateTask(taskId, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setTask(result.data); })
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [taskId, refreshCount]);
  const status = statuses[task?.status] || [task?.status || "—"];
  return <Modal open title="Thông tin lần đối chiếu" onCancel={onClose} footer={<Button onClick={onClose}>Đóng</Button>}>
    {loading ? <Skeleton active /> : error ? <Alert type="error" showIcon role="alert" title={error} action={<Button onClick={() => setRefreshCount((value) => value + 1)}>Thử lại</Button>} />
      : task && <>
        <Descriptions column={1} items={[
          { key: "status", label: "Trạng thái", children: <Tag color={status[1]}>{status[0]}</Tag> },
          { key: "method", label: "Phương pháp", children: task.algorithm_version || "—" },
          { key: "model", label: "Model", children: task.model_name || "Quy tắc từ khóa" },
          { key: "created", label: "Tạo lúc", children: formatDateTime(task.created_at) },
          { key: "started", label: "Bắt đầu", children: formatDateTime(task.started_at) },
          { key: "finished", label: "Kết thúc", children: formatDateTime(task.finished_at) },
        ]} />
        {task.error_message && <Alert type="error" showIcon title={task.error_message} />}
        {["QUEUED", "RUNNING"].includes(task.status) && <Button onClick={() => setRefreshCount((value) => value + 1)}>Cập nhật trạng thái</Button>}
      </>}
  </Modal>;
}

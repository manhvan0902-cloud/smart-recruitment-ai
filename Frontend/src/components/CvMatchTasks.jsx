import { useCallback, useEffect } from "react";
import { Alert, Button, Card, Empty, Pagination, Tag } from "antd";
import usePaginatedList from "../hooks/usePaginatedList";
import { apiRequest } from "../services/api";
import { formatDateTime } from "../utils/format";

const statuses = { RUNNING: ["Đang xử lý", "processing"], QUEUED: ["Chờ xử lý", "default"], SUCCEEDED: ["Thành công", "success"], FAILED: ["Thất bại", "error"] };

export default function CvMatchTasks({ cvId, refreshToken, disabled }) {
  const load = useCallback((query, signal) => apiRequest("/candidate/cvs/" + encodeURIComponent(cvId) + "/ai-tasks", { query: { ...query, feature: "MATCH_CV" }, signal }), [cvId]);
  const history = usePaginatedList(load, { page: 1, limit: 10 });
  useEffect(() => { history.reload(); }, [refreshToken, history.reload]);
  return <Card title="Lịch sử xử lý đối chiếu" className="ai-assistant-card" extra={<Button loading={history.loading} disabled={disabled || history.loading} onClick={history.reload}>Tải lại</Button>}>
    {history.error && <Alert className="form-alert" type="error" showIcon title={history.error} />}
    {!history.loading && !history.rows.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lần đối chiếu nào." />}
    {history.rows.map((task) => {
      const status = statuses[task.status] || [task.status];
      return <div key={task.id} className="ai-task-row"><div><strong>{formatDateTime(task.created_at)}</strong> <Tag color={status[1]}>{status[0]}</Tag></div>
        <p className="muted-text">{task.model_name || "Quy tắc từ khóa"} · Tin #{task.job_id || "—"}</p>
        {task.error_message && <Alert type="warning" showIcon title={task.error_message} />}</div>;
    })}
    {history.total > 10 && <Pagination size="small" current={history.query.page} pageSize={10} total={history.total} showSizeChanger={false} disabled={disabled || history.loading}
      onChange={(page) => history.setQuery((current) => ({ ...current, page }))} />}
  </Card>;
}

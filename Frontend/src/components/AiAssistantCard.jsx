import { useEffect, useRef, useState } from "react";
import { Alert, App, Button, Card, Input, Pagination, Select, Space, Tag } from "antd";
import { ReloadOutlined, ThunderboltOutlined } from "@ant-design/icons";
import usePaginatedList from "../hooks/usePaginatedList";
import { formatDateTime } from "../utils/format";

const taskLabels = { RUNNING: "Đang xử lý", QUEUED: "Chờ xử lý", SUCCEEDED: "Thành công", FAILED: "Thất bại" };

export default function AiAssistantCard({ title, actionLabel, description, generate, loadHistory, sourceVersion, disabled, allowNotes = false, onBusy, onSettled, renderOutput }) {
  const { message } = App.useApp();
  const history = usePaginatedList(loadHistory, { page: 1, limit: 10 });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [selectedTask, setSelectedTask] = useState();
  const operation = useRef(null);
  useEffect(() => () => { operation.current?.abort(); onBusy?.(false); }, [onBusy]);
  const oldVersion = result?.meta?.sourceVersion != null && String(result.meta.sourceVersion) !== String(sourceVersion);

  useEffect(() => {
    const latest = history.rows[0];
    if (!result && !selectedTask && history.query.page === 1 && !history.loading && latest?.status === "SUCCEEDED" &&
        latest.output_json && typeof latest.output_json === "object" && !Array.isArray(latest.output_json)) {
      setResult({ data: latest.output_json, meta: latest.output_json?.meta });
      setSelectedTask(String(latest.id));
    }
  }, [history.rows, history.query.page, history.loading, result, selectedTask]);

  useEffect(() => {
    if (!selectedTask) return;
    const task = history.rows.find((item) => String(item.id) === selectedTask);
    if (!task) return;
    if (task.status === "SUCCEEDED" && task.output_json && typeof task.output_json === "object" && !Array.isArray(task.output_json)) {
      setError("");
      setResult({ data: task.output_json, meta: task.output_json?.meta });
    } else {
      setResult(null);
      setError(task.error_message || (task.status === "SUCCEEDED" ? "Lần xử lý cũ không có nội dung kết quả để hiển thị. Bạn có thể tạo kết quả mới." : "Tác vụ đang xử lý. Tải lại lịch sử để cập nhật kết quả."));
    }
  }, [history.rows, selectedTask]);

  async function run() {
    if (operation.current || disabled) return;
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    onBusy?.(true);
    setError("");
    try {
      const response = await generate({ notes: notes.trim() }, controller.signal);
      if (controller.signal.aborted) return;
      setResult({ data: response.data, meta: response.meta });
      setSelectedTask(undefined);
      history.setQuery((current) => ({ ...current, page: 1 }));
      message.success("Đã tạo kết quả AI. Hãy xem lại nội dung trước khi sử dụng.");
    } catch (requestError) {
      if (!controller.signal.aborted) {
        const wait = requestError.response?.error?.retryAfterSeconds;
        setError(requestError.message + (Number.isSafeInteger(wait) && wait > 0 ? ` Có thể thử lại sau ${wait} giây.` : ""));
        history.reload();
      }
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) { setSaving(false); onBusy?.(false); onSettled?.(); }
    }
  }

  function selectTask(id) {
    setSelectedTask(id);
  }

  return <Card title={title} className="ai-assistant-card">
    <p className="section-help">{description}</p>
    {allowNotes && <><label className="field-label">Yêu cầu bổ sung cho AI<Input.TextArea value={notes} rows={3} maxLength={2000} showCount disabled={disabled || saving}
      onChange={(event) => setNotes(event.target.value)} placeholder="Ví dụ tập trung vào kỹ năng backend và tình huống thực tế" /></label></>}
    <Space wrap className="ai-card-actions"><Button type="primary" icon={<ThunderboltOutlined />} loading={saving} disabled={disabled || saving} onClick={run}>{actionLabel}</Button>
      <Button icon={<ReloadOutlined />} disabled={saving || history.loading} onClick={history.reload}>Tải lại lịch sử</Button></Space>
    {saving && <Alert className="form-alert" type="info" showIcon title="Dịch vụ AI đang xử lý yêu cầu. Vui lòng chờ kết quả." />}
    {error && <Alert className="form-alert" type="error" role="alert" showIcon title={error} description="Nếu kết nối bị gián đoạn, hãy tải lại lịch sử để kiểm tra trước khi gửi yêu cầu mới." />}
    {history.error && <Alert className="form-alert" type="warning" showIcon title={history.error} action={<Button disabled={saving} onClick={history.reload}>Tải lại lịch sử</Button>} />}
    {(history.total > 0 || history.loading) && <div className="ai-history-picker"><label className="field-label">Lịch sử xử lý<Select className="full-width" value={selectedTask} loading={history.loading} disabled={saving || history.loading}
      placeholder="Chọn một lần xử lý để xem" onChange={selectTask}
      options={history.rows.map((task) => ({ value: String(task.id), label: formatDateTime(task.created_at) + " · " + (taskLabels[task.status] || task.status) + " · " + (task.model_name || "Không rõ model") }))} /></label>
      {history.total > 10 && <Pagination size="small" current={history.query.page} pageSize={10} total={history.total} showSizeChanger={false} disabled={saving || history.loading}
        onChange={(page) => { setSelectedTask(undefined); history.setQuery((current) => ({ ...current, page })); }} />}</div>}
    {result && <div className="ai-generated-output">
      <Space wrap><Tag color="purple">{result.meta?.providerLabel || "OpenAI"}</Tag><span className="muted-text">{result.meta?.model} · {formatDateTime(result.meta?.generatedAt)}</span></Space>
      {oldVersion && <Alert className="form-alert" type="warning" showIcon title="Kết quả này dùng phiên bản dữ liệu cũ. Hãy kiểm tra nội dung hoặc tạo lại theo dữ liệu hiện tại." />}
      {renderOutput(result.data, { oldVersion, busy: saving, meta: result.meta })}
    </div>}
  </Card>;
}

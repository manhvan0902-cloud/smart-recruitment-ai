import { useEffect, useRef, useState } from "react";
import { Alert, App, Button, Card, Form, Input, Modal, Select } from "antd";
import { applicationStatuses } from "../config/applications";
import { updateRecruiterApplication } from "../services/recruiterService";

const transitions = {
  SUBMITTED: ["REVIEWING", "REJECTED"],
  REVIEWING: ["INTERVIEW", "REJECTED"],
  INTERVIEW: ["OFFERED", "REJECTED"],
  OFFERED: ["HIRED", "REJECTED"],
};

export default function ApplicationReviewCard({ application, disabled, onChanged, onBusy }) {
  const { message } = App.useApp();
  const [note, setNote] = useState(application.recruiter_note || "");
  const [nextStatus, setNextStatus] = useState();
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState(null);
  const baseline = useRef(application.recruiter_note || "");
  const operation = useRef(null);
  const allowed = transitions[application.status] || [];
  const hasCompleted = Number(application.completed_interview_count) > 0;
  const statusLabel = applicationStatuses.find((item) => item.value === nextStatus)?.label;
  const dirtyNote = note !== (application.recruiter_note || "");

  useEffect(() => {
    const serverNote = application.recruiter_note || "";
    const previousNote = baseline.current;
    setNote((current) => current === previousNote ? serverNote : current);
    baseline.current = serverNote;
  }, [application.recruiter_note]);
  useEffect(() => { setNextStatus(undefined); setConfirmOpen(false); }, [application.status]);
  useEffect(() => () => { operation.current?.abort(); onBusy(false); }, [onBusy]);

  async function save() {
    if (operation.current || disabled || (!nextStatus && !dirtyNote)) return;
    if (nextStatus && (!allowed.includes(nextStatus) || (nextStatus === "OFFERED" && !hasCompleted))) return;
    const body = { ...(nextStatus ? { status: nextStatus } : {}), ...(dirtyNote ? { recruiter_note: note || null } : {}) };
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    onBusy(true);
    setError(null);
    try {
      const result = await updateRecruiterApplication(application.id, body, controller.signal);
      if (controller.signal.aborted) return;
      setConfirmOpen(false);
      setNextStatus(undefined);
      onChanged({ ...result.data, ...(dirtyNote ? { recruiter_note: body.recruiter_note } : {}) });
      message.success("Đã lưu kết quả xét duyệt.");
    } catch (requestError) {
      if (!controller.signal.aborted) { setError(requestError); setConfirmOpen(false); }
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) { setSaving(false); onBusy(false); }
    }
  }

  return <Card title="Xét duyệt hồ sơ">
    {error && <Alert className="form-alert" type="error" role="alert" showIcon title={error.message}
      action={[404, 409].includes(error.status) ? <Button disabled={disabled || saving} onClick={() => onChanged()}>Tải dữ liệu mới</Button> : undefined} />}
    <Form layout="vertical" requiredMark={false} disabled={disabled || saving || confirmOpen}>
      {allowed.length > 0 ? <Form.Item label="Chuyển trạng thái" htmlFor="review-status">
        <Select id="review-status" allowClear placeholder="Giữ trạng thái hiện tại" value={nextStatus} onChange={setNextStatus}
          options={applicationStatuses.filter((item) => allowed.includes(item.value)).map((item) => ({ ...item, disabled: item.value === "OFFERED" && !hasCompleted }))} />
      </Form.Item> : <p className="muted-text">Hồ sơ đã kết thúc quá trình xét tuyển. Bạn vẫn có thể cập nhật ghi chú nội bộ.</p>}
      {application.status === "INTERVIEW" && <Alert className="form-alert" type={hasCompleted ? "success" : "info"} showIcon
        title={hasCompleted ? "Đã có lịch phỏng vấn hoàn tất, có thể gửi đề nghị làm việc." : "Cần hoàn tất ít nhất một lịch phỏng vấn trước khi gửi đề nghị làm việc."} />}
      <Form.Item label="Ghi chú nội bộ" htmlFor="recruiter-note" extra="Chỉ nhà tuyển dụng của công ty xem được ghi chú này.">
        <Input.TextArea id="recruiter-note" value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={65535} showCount />
      </Form.Item>
      <Button type="primary" loading={saving} disabled={disabled || saving || confirmOpen || (!nextStatus && !dirtyNote)}
        onClick={() => { setError(null); if (nextStatus) setConfirmOpen(true); else save(); }}>Lưu xét duyệt</Button>
    </Form>
    <Modal open={confirmOpen} title="Xác nhận chuyển trạng thái" okText="Xác nhận và lưu" cancelText="Hủy" onOk={save}
      onCancel={() => { if (!operation.current) setConfirmOpen(false); }} confirmLoading={saving} okButtonProps={{ danger: nextStatus === "REJECTED", disabled }}
      cancelButtonProps={{ disabled: saving }} closable={!saving} keyboard={!saving} mask={{ closable: !saving }}>
      <p>Chuyển hồ sơ sang trạng thái <strong>{statusLabel}</strong> và gửi thông báo cho ứng viên.</p>
      {["HIRED", "REJECTED"].includes(nextStatus) && <Alert type="warning" showIcon title="Các lịch chưa bắt đầu sẽ bị hủy. Hồ sơ sẽ kết thúc quá trình xét tuyển." />}
    </Modal>
  </Card>;
}

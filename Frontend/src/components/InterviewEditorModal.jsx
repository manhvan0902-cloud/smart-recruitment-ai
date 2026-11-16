import { useEffect, useRef, useState } from "react";
import { Alert, App, Form, Input, Modal, Select } from "antd";
import { createRecruiterInterview, updateRecruiterInterview } from "../services/recruiterService";
import { toVietnamDateInput, validDeadline } from "../utils/jobs";

function initialValues(interview) {
  return {
    title: interview?.title || "",
    starts_at: toVietnamDateInput(interview?.starts_at),
    ends_at: toVietnamDateInput(interview?.ends_at),
    mode: interview?.mode || "ONLINE",
    meeting_url: interview?.meeting_url || "",
    location_text: interview?.location_text || "",
    invitation_note: interview?.invitation_note || "",
  };
}

export default function InterviewEditorModal({ applicationId, interview, onClose, onSaved, onBusy, disabled }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef(null);
  const mode = Form.useWatch("mode", form) || interview?.mode || "ONLINE";
  const original = initialValues(interview);
  useEffect(() => () => { operation.current?.abort(); onBusy(false); }, [onBusy]);

  async function save(values) {
    if (operation.current || disabled) return;
    // Keep original seconds/milliseconds when the minute input was not changed.
    const startsAt = interview && values.starts_at === original.starts_at ? interview.starts_at : new Date(values.starts_at + "+07:00").toISOString();
    const endsAt = interview && values.ends_at === original.ends_at ? interview.ends_at : new Date(values.ends_at + "+07:00").toISOString();
    if (new Date(startsAt).getTime() <= Date.now()) { setError("Thời gian bắt đầu phải ở tương lai."); return; }
    if (new Date(endsAt) <= new Date(startsAt)) { setError("Thời gian kết thúc phải sau thời gian bắt đầu."); return; }
    const normalized = {
      title: values.title.trim(), starts_at: startsAt, ends_at: endsAt,
      mode: values.mode,
      meeting_url: values.mode === "ONLINE" ? values.meeting_url.trim() : null,
      location_text: values.mode === "OFFLINE" ? values.location_text.trim() : null,
      invitation_note: values.invitation_note?.trim() || null,
    };
    const body = interview ? Object.fromEntries(Object.entries(normalized).filter(([key, value]) => {
      if (["starts_at", "ends_at"].includes(key)) return new Date(value).getTime() !== new Date(interview[key]).getTime();
      // Preserve hidden legacy fields unless the interview mode actually changes.
      if ((key === "location_text" && values.mode === "ONLINE") || (key === "meeting_url" && values.mode === "OFFLINE")) return values.mode !== interview.mode;
      return value !== (interview[key] ?? null);
    })) : { ...normalized, timezone_name: "Asia/Ho_Chi_Minh" };
    if (!Object.keys(body).length) { message.info("Chưa có thay đổi để lưu."); return; }
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    onBusy(true);
    setError("");
    try {
      if (interview) await updateRecruiterInterview(interview.id, body, controller.signal);
      else await createRecruiterInterview(applicationId, body, controller.signal);
      if (controller.signal.aborted) return;
      message.success(interview ? "Đã cập nhật lịch phỏng vấn." : "Đã tạo lịch phỏng vấn và chuyển hồ sơ sang vòng phỏng vấn.");
      onSaved();
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError.message);
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) { setSaving(false); onBusy(false); }
    }
  }

  const dateRules = [{ required: true, message: "Chọn ngày và giờ." }, { validator: (_, value) => !value || validDeadline(value) ? Promise.resolve() : Promise.reject(new Error("Ngày và giờ không hợp lệ.")) }];
  return <Modal open title={interview ? "Sửa lịch phỏng vấn" : "Tạo lịch phỏng vấn"} onOk={() => form.submit()} onCancel={() => { if (!operation.current) onClose(); }}
    okText={interview ? "Lưu thay đổi" : "Tạo lịch"} cancelText="Hủy" confirmLoading={saving} okButtonProps={{ disabled }} cancelButtonProps={{ disabled: saving }}
    closable={!saving} keyboard={!saving} mask={{ closable: !saving }} width={660}>
    <Alert className="form-alert" type="info" showIcon title="Nhập thời gian theo giờ Việt Nam (UTC+7)."
      description={interview ? "Đổi thời gian, hình thức, liên kết họp hoặc địa điểm sẽ yêu cầu ứng viên phản hồi lại. Múi giờ đã lưu của lịch được giữ nguyên." : "Lịch mới được lưu với múi giờ Asia/Ho_Chi_Minh. Ứng viên cần xác nhận trước khi lịch bắt đầu."} />
    {error && <Alert className="form-alert" type="error" role="alert" showIcon title={error} />}
    <Form form={form} layout="vertical" requiredMark={false} initialValues={original} onFinish={save} disabled={saving || disabled}>
      <Form.Item name="title" label="Tên buổi phỏng vấn" rules={[{ required: true, whitespace: true, message: "Nhập tên buổi phỏng vấn." }, { max: 200 }]}><Input maxLength={200} /></Form.Item>
      <div className="interview-time-fields">
        <Form.Item name="starts_at" label="Bắt đầu (UTC+7)" rules={dateRules}><Input type="datetime-local" step={60} /></Form.Item>
        <Form.Item name="ends_at" label="Kết thúc (UTC+7)" rules={dateRules}><Input type="datetime-local" step={60} /></Form.Item>
      </div>
      <Form.Item name="mode" label="Hình thức" rules={[{ required: true }]}><Select options={[{ value: "ONLINE", label: "Trực tuyến" }, { value: "OFFLINE", label: "Trực tiếp" }]} /></Form.Item>
      {mode === "ONLINE" ? <Form.Item name="meeting_url" label="Liên kết họp HTTPS" rules={[{ required: true, whitespace: true, message: "Nhập liên kết họp." }, { max: 1000 },
        { validator: (_, value) => { if (!value) return Promise.resolve(); try { if (new URL(value.trim()).protocol === "https:") return Promise.resolve(); } catch {} return Promise.reject(new Error("Liên kết họp phải dùng HTTPS.")); } }]}>
        <Input maxLength={1000} placeholder="https://…" /></Form.Item>
        : <Form.Item name="location_text" label="Địa điểm phỏng vấn" rules={[{ required: true, whitespace: true, message: "Nhập địa điểm phỏng vấn." }, { max: 500 }]}><Input.TextArea rows={2} maxLength={500} /></Form.Item>}
      <Form.Item name="invitation_note" label="Nội dung lời mời" rules={[{ max: 65535 }]}><Input.TextArea rows={4} maxLength={65535} /></Form.Item>
    </Form>
  </Modal>;
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, App, Button, Card, Descriptions, Empty, Modal, Pagination, Select, Skeleton, Space, Tag } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { interviewResponses, interviewStatuses } from "../config/interviews";
import usePaginatedList from "../hooks/usePaginatedList";
import { listCandidateInterviews, respondToCandidateInterview } from "../services/candidateService";
import { cancelRecruiterInterview, completeRecruiterInterview, listRecruiterInterviews } from "../services/recruiterService";
import { formatDateTime, getWebsiteUrl } from "../utils/format";
import InterviewEditorModal from "./InterviewEditorModal";
import StatusTag from "./StatusTag";

const confirmations = {
  ACCEPTED: { title: "Chấp nhận lịch phỏng vấn?", text: "Bạn xác nhận tham dự buổi phỏng vấn theo thời gian và hình thức đã được mời.", ok: "Chấp nhận" },
  DECLINED: { title: "Từ chối lịch phỏng vấn?", text: "Bạn chỉ được phản hồi một lần cho lịch hiện tại. Nhà tuyển dụng sẽ nhận được phản hồi này.", ok: "Từ chối", danger: true },
  cancel: { title: "Hủy lịch phỏng vấn?", text: "Lịch sẽ chuyển sang đã hủy và ứng viên sẽ được thông báo. Bạn có thể tạo lịch mới khi hồ sơ còn ở vòng xét tuyển phù hợp.", ok: "Hủy lịch", danger: true },
  complete: { title: "Hoàn tất buổi phỏng vấn?", text: "Xác nhận buổi phỏng vấn đã kết thúc. Hồ sơ có thể được chuyển sang đề nghị làm việc sau bước này.", ok: "Hoàn tất" },
};

export default function InterviewsPanel({ recruiter = false, application, applicationId = "", onChanged, onBusy, disabled = false, refreshToken = 0 }) {
  const scopeId = application?.id || applicationId;
  const list = usePaginatedList(recruiter ? listRecruiterInterviews : listCandidateInterviews, { page: 1, limit: 10, status: "", applicationId: scopeId });
  const { message } = App.useApp();
  const [now, setNow] = useState(Date.now());
  const [editor, setEditor] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const operation = useRef(null);
  const prefix = recruiter ? "/recruiter" : "/candidate";
  const locked = busy || disabled || list.loading;
  const canCreate = recruiter && application && ["REVIEWING", "INTERVIEW"].includes(application.status);
  const reportBusy = useCallback((value) => { setBusy(value); onBusy?.(value); }, [onBusy]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => () => { operation.current?.abort(); onBusy?.(false); }, [onBusy]);
  useEffect(() => {
    list.setQuery((current) => String(current.applicationId) === String(scopeId) ? current : { ...current, applicationId: scopeId, page: 1 });
  }, [scopeId, list.setQuery]);
  useEffect(() => { list.reload(); }, [refreshToken, application?.status, list.reload]);

  function afterChange(delta) {
    list.setRows([]);
    if (onChanged) onChanged(delta);
    else list.reload();
  }

  function reloadAll() {
    if (onChanged) onChanged();
    else list.reload();
  }

  async function performAction() {
    if (operation.current || disabled || !confirmation) return;
    const { interview, kind } = confirmation;
    const controller = new AbortController();
    operation.current = controller;
    reportBusy(true);
    setError(null);
    try {
      if (kind === "cancel") await cancelRecruiterInterview(interview.id, controller.signal);
      else if (kind === "complete") await completeRecruiterInterview(interview.id, controller.signal);
      else await respondToCandidateInterview(interview.id, kind, controller.signal);
      if (controller.signal.aborted) return;
      setConfirmation(null);
      afterChange();
      message.success(kind === "cancel" ? "Đã hủy lịch phỏng vấn." : kind === "complete" ? "Đã hoàn tất phỏng vấn." : "Đã gửi phản hồi lịch phỏng vấn.");
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError);
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) reportBusy(false);
    }
  }

  function openAction(interview, kind) { setError(null); setConfirmation({ interview, kind }); }
  const confirmConfig = confirmation && confirmations[confirmation.kind];
  return <Card title="Lịch phỏng vấn" className="interviews-panel" extra={canCreate && <Button type="primary" icon={<PlusOutlined />} disabled={locked}
    onClick={() => setEditor({ interview: null, applicationId: application.id })}>Tạo lịch</Button>}>
    {application && recruiter && !canCreate && <Alert className="form-alert" type="info" showIcon title="Chỉ tạo lịch khi hồ sơ đang xem xét hoặc ở vòng phỏng vấn." />}
    <div className="interview-toolbar">
      <div className="filter-field"><label htmlFor={application ? "application-interview-status" : "interview-status"}>Trạng thái lịch</label>
        <Select id={application ? "application-interview-status" : "interview-status"} value={list.query.status} disabled={busy || disabled}
          options={[{ value: "", label: "Tất cả trạng thái" }, ...interviewStatuses]}
          onChange={(status) => list.setQuery((current) => ({ ...current, page: 1, status }))} /></div>
      <Button icon={<ReloadOutlined />} disabled={locked} onClick={() => { setError(null); reloadAll(); }}>Tải lại lịch</Button>
    </div>
    <p className="muted-text">Thời gian hiển thị theo giờ Việt Nam (UTC+7). Tải lại lịch để nhận thay đổi từ người tham gia.</p>
    {list.error && <Alert className="form-alert" type="error" role="alert" showIcon title={list.error} action={<Button disabled={busy || disabled} onClick={list.reload}>Thử lại</Button>} />}
    {list.loading ? <Skeleton active paragraph={{ rows: 5 }} /> : list.rows.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={list.error ? "Chưa tải được lịch phỏng vấn." : "Chưa có lịch phỏng vấn trong danh sách."} />
      : <div className="interview-list">{list.rows.map((interview) => {
        const currentApplication = application || interview.application;
        const applicationStatus = currentApplication?.status;
        const scheduled = interview.status === "SCHEDULED";
        const future = new Date(interview.starts_at).getTime() > now;
        const ended = new Date(interview.ends_at).getTime() <= now;
        const editable = recruiter && scheduled && ["REVIEWING", "INTERVIEW"].includes(applicationStatus);
        const respondable = !recruiter && scheduled && future && interview.candidate_response === "PENDING" && applicationStatus === "INTERVIEW";
        const completable = recruiter && scheduled && ended && interview.candidate_response === "ACCEPTED" && applicationStatus === "INTERVIEW";
        const response = interviewResponses[interview.candidate_response] || { label: "Chưa xác định" };
        const meetingUrl = getWebsiteUrl(interview.meeting_url);
        return <Card key={interview.id} size="small" className="interview-card">
          <div className="interview-card-heading"><h3>{interview.title}</h3><Space wrap><StatusTag status={interview.status} /><Tag color={response.color}>{response.label}</Tag></Space></div>
          {!application && <div className="interview-identity"><Link to={prefix + "/applications/" + interview.application_id}>{interview.application?.job?.title || "Xem đơn ứng tuyển"}</Link>
            <span className="muted-text">{recruiter ? interview.application?.candidate?.full_name || "Ứng viên" : interview.application?.job?.company?.name || ""}</span>
            {recruiter && interview.application?.candidate?.email && <span className="muted-text">{interview.application.candidate.email}</span>}</div>}
          <Descriptions column={1} size="small" items={[
            { key: "start", label: "Bắt đầu (UTC+7)", children: formatDateTime(interview.starts_at) },
            { key: "end", label: "Kết thúc (UTC+7)", children: formatDateTime(interview.ends_at) },
            { key: "timezone", label: "Múi giờ đã lưu", children: interview.timezone_name || "Asia/Ho_Chi_Minh" },
            ...(!application ? [{ key: "application", label: "Trạng thái hồ sơ", children: <StatusTag status={applicationStatus} /> }] : []),
            { key: "mode", label: "Hình thức", children: interview.mode === "ONLINE" ? "Trực tuyến" : "Trực tiếp" },
            { key: "place", label: interview.mode === "ONLINE" ? "Liên kết họp" : "Địa điểm", children: interview.mode === "ONLINE"
              ? meetingUrl?.startsWith("https:") ? <a href={meetingUrl} target="_blank" rel="noopener noreferrer">Mở liên kết họp</a> : "Liên kết không hợp lệ"
              : <span className="preserve-text">{interview.location_text || "—"}</span> },
            ...(interview.responded_at ? [{ key: "responded", label: "Phản hồi lúc", children: formatDateTime(interview.responded_at) }] : []),
          ]} />
          {interview.invitation_note && <div className="interview-invitation"><strong>Nội dung lời mời</strong><p className="preserve-text job-body-text">{interview.invitation_note}</p></div>}
          {scheduled && <p className="muted-text">{interview.candidate_response === "DECLINED" ? "Ứng viên đã từ chối lịch. Nhà tuyển dụng có thể sửa thông tin cần xác nhận để mời lại hoặc hủy lịch."
            : !future && interview.candidate_response === "PENDING" ? "Lịch đã bắt đầu, không còn được phép phản hồi."
              : recruiter && interview.candidate_response === "ACCEPTED" && !ended ? "Có thể hoàn tất sau giờ kết thúc nếu hồ sơ vẫn ở vòng phỏng vấn."
                : respondable ? "Bạn chỉ phản hồi một lần cho lịch hiện tại. Nếu lịch thay đổi thời gian hoặc hình thức, bạn sẽ cần xác nhận lại." : ""}</p>}
          <Space wrap className="interview-actions">
            {editable && <Button disabled={locked} onClick={() => setEditor({ interview, applicationId: interview.application_id })}>Sửa lịch</Button>}
            {recruiter && scheduled && <Button danger disabled={locked} onClick={() => openAction(interview, "cancel")}>Hủy lịch</Button>}
            {completable && <Button type="primary" disabled={locked} onClick={() => openAction(interview, "complete")}>Hoàn tất phỏng vấn</Button>}
            {respondable && <><Button type="primary" disabled={locked} onClick={() => openAction(interview, "ACCEPTED")}>Chấp nhận</Button>
              <Button danger disabled={locked} onClick={() => openAction(interview, "DECLINED")}>Từ chối</Button></>}
            {!application && <Link to={prefix + "/applications/" + interview.application_id}><Button disabled={busy}>Xem hồ sơ</Button></Link>}
          </Space>
        </Card>;
      })}</div>}
    {list.total > 0 && <div className="interview-pagination"><Pagination current={list.query.page} pageSize={list.query.limit} total={list.total} disabled={busy || disabled}
      showSizeChanger pageSizeOptions={[10, 20, 50, 100]} showTotal={(total) => `${total} lịch phỏng vấn`}
      onChange={(page, limit) => list.setQuery((current) => ({ ...current, page, limit }))} /></div>}
    {editor && <InterviewEditorModal key={editor.interview?.id || "new"} {...editor} disabled={disabled} onBusy={reportBusy} onClose={() => setEditor(null)}
      onSaved={() => { const created = !editor.interview; setEditor(null); afterChange(created ? { status: "INTERVIEW" } : undefined); }} />}
    <Modal open={Boolean(confirmation)} title={confirmConfig?.title} onOk={performAction} onCancel={() => { if (!operation.current) { setConfirmation(null); setError(null); } }}
      okText={confirmConfig?.ok} cancelText="Quay lại" confirmLoading={busy} okButtonProps={{ danger: confirmConfig?.danger, disabled }}
      cancelButtonProps={{ disabled: busy }} closable={!busy} keyboard={!busy} mask={{ closable: !busy }}>
      <p>{confirmConfig?.text}</p>
      {confirmation && <p><strong>{confirmation.interview.title}</strong><br />{formatDateTime(confirmation.interview.starts_at)} (UTC+7)</p>}
      {error && <Alert type="error" role="alert" showIcon title={error.message} action={[404, 409].includes(error.status)
        ? <Button disabled={busy} onClick={() => { setConfirmation(null); setError(null); reloadAll(); }}>Tải dữ liệu mới</Button> : undefined} />}
    </Modal>
  </Card>;
}

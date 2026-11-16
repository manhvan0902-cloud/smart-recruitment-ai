import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, App, Button, Card, Collapse, Descriptions, Modal, Result, Skeleton, Space, Tag } from "antd";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";
import { Link, useParams } from "react-router-dom";
import CvDownloadButton from "../components/CvDownloadButton";
import StatusTag from "../components/StatusTag";
import SubmittedProfile from "../components/SubmittedProfile";
import ApplicationReviewCard from "../components/ApplicationReviewCard";
import InterviewsPanel from "../components/InterviewsPanel";
import { getCandidateApplication, withdrawCandidateApplication } from "../services/candidateService";
import { getRecruiterApplication, getRecruiterApplicationCvDownload } from "../services/recruiterService";
import { formatDateTime, formatFileSize } from "../utils/format";
import { formatSalary, workModeLabels } from "../utils/jobs";

export default function ApplicationDetailsPage({ recruiter = false }) {
  const { applicationId } = useParams();
  return <ApplicationDetails key={`${recruiter}:${applicationId}`} recruiter={recruiter} applicationId={applicationId} />;
}

function ApplicationDetails({ recruiter, applicationId }) {
  const { message } = App.useApp();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [interviewBusy, setInterviewBusy] = useState(false);
  const hasLoaded = useRef(false);
  const operation = useRef(null);
  const prefix = recruiter ? "/recruiter" : "/candidate";
  const onChanged = useCallback((delta) => {
    if (delta) setApplication((current) => current ? { ...current, ...delta } : current);
    setRefreshCount((value) => value + 1);
  }, []);

  useEffect(() => {
    setSaving(false);
    return () => operation.current?.abort();
  }, [applicationId, recruiter]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(!hasLoaded.current);
    setRefreshing(true);
    setLoadError(null);
    setError("");
    setConfirmOpen(false);
    document.title = "Chi tiết đơn ứng tuyển | Smart Recruitment";
    const load = recruiter ? getRecruiterApplication : getCandidateApplication;
    load(applicationId, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { hasLoaded.current = true; setApplication(result.data); } })
      .catch((requestError) => { if (!controller.signal.aborted) setLoadError(requestError); })
      .finally(() => { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); } });
    return () => controller.abort();
  }, [applicationId, recruiter, refreshCount]);

  async function withdraw() {
    if (operation.current || recruiter || !application) return;
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    setError("");
    try {
      await withdrawCandidateApplication(applicationId, controller.signal);
      if (controller.signal.aborted) return;
      setApplication((current) => ({ ...current, status: "WITHDRAWN" }));
      setConfirmOpen(false);
      setRefreshCount((value) => value + 1);
      message.success("Đã rút đơn ứng tuyển.");
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError.message);
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  if (loading) return <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>;
  if (loadError?.status === 404) return <Result status="404" title="Không tìm thấy đơn ứng tuyển" extra={<Link to={prefix + "/applications"}><Button>Về danh sách đơn</Button></Link>} />;
  if (loadError && !application) return <Alert type="error" role="alert" showIcon title={loadError.message} action={<Button onClick={() => onChanged()}>Thử lại</Button>} />;
  if (!application) return null;
  const job = application.job_snapshot || {};
  const cv = application.cv_snapshot || {};
  const profile = application.profile_snapshot || {};
  const canWithdraw = !recruiter && ["SUBMITTED", "REVIEWING"].includes(application.status);
  const jobSkills = job.skills || [];
  const busy = saving || reviewBusy || interviewBusy || refreshing;

  return <section>
    <Link className="back-link" to={prefix + "/applications"}><ArrowLeftOutlined /> Đơn ứng tuyển</Link>
    <div className="page-heading page-heading-with-actions"><div><h1>{recruiter ? profile.full_name || "Hồ sơ ứng viên" : "Chi tiết đơn ứng tuyển"}</h1>
      <p>{job.title || application.job?.title}</p></div><Space wrap>
      <Button icon={<ReloadOutlined />} loading={refreshing} disabled={busy} onClick={() => onChanged()}>Tải lại</Button>
      <Link to={prefix + "/interviews?applicationId=" + applicationId}><Button disabled={busy}>Xem lịch riêng</Button></Link>
      {canWithdraw && <Button danger disabled={busy} onClick={() => { setError(""); setConfirmOpen(true); }}>Rút đơn</Button>}
    </Space></div>
    <div className="application-detail-sections">
      {loadError && <Alert type="error" role="alert" showIcon title={loadError.message} description="Chưa cập nhật được thông tin mới nhất. Nội dung đang nhập vẫn được giữ lại."
        action={<Button disabled={busy} onClick={() => onChanged()}>Thử lại</Button>} />}
      <Card title="Thông tin đơn"><Descriptions column={1} items={[
        { key: "status", label: "Trạng thái", children: <StatusTag status={application.status} /> },
        { key: "date", label: "Ngày nộp", children: formatDateTime(application.submitted_at) },
        { key: "job", label: "Vị trí ứng tuyển", children: job.title || application.job?.title || "—" },
        { key: "company", label: "Công ty", children: job.company?.name || application.job?.company?.name || "—" },
      ]} /></Card>
      {recruiter && <ApplicationReviewCard application={application} disabled={interviewBusy || refreshing || Boolean(loadError)} onBusy={setReviewBusy} onChanged={onChanged} />}
      <InterviewsPanel recruiter={recruiter} application={application} disabled={reviewBusy || saving || refreshing || Boolean(loadError)} onBusy={setInterviewBusy}
        onChanged={onChanged} refreshToken={refreshCount} />
      <Card title="Hồ sơ tại thời điểm ứng tuyển"><SubmittedProfile profile={profile} jobSkills={jobSkills} /></Card>
      <Card title="CV đã nộp"><Descriptions column={1} items={[
        { key: "name", label: "Tên CV", children: cv.name || application.cv?.name || "—" },
        { key: "file", label: "Tên tệp", children: cv.file?.original_name || "—" },
        { key: "size", label: "Dung lượng", children: formatFileSize(cv.file?.byte_size) },
      ]} />
        {recruiter ? <CvDownloadButton key={applicationId} load={(signal) => getRecruiterApplicationCvDownload(applicationId, signal)} />
          : <Link to={"/candidate/cvs/" + application.cv_id}><Button>Xem thông tin CV</Button></Link>}
        {cv.raw_text && <Collapse className="cv-text-collapse" items={[{ key: "text", label: "Văn bản CV lúc nộp", children: <pre className="cv-raw-text">{cv.raw_text}</pre> }]} />}
      </Card>
      <Card title="Thư giới thiệu"><p className="preserve-text job-body-text">{application.cover_letter || "Chưa gửi thư giới thiệu."}</p></Card>
      <Card title="Tin tuyển dụng tại thời điểm nộp"><Descriptions column={1} items={[
        { key: "salary", label: "Lương", children: formatSalary(job) },
        { key: "mode", label: "Hình thức làm việc", children: workModeLabels[job.work_mode] || "—" },
        { key: "location", label: "Địa điểm", children: job.location?.name || "—" },
        { key: "industry", label: "Ngành nghề", children: job.industry?.name || "—" },
        { key: "level", label: "Cấp bậc", children: job.level?.name || "—" },
        { key: "type", label: "Loại việc", children: job.employmentType?.name || "—" },
        { key: "address", label: "Địa chỉ", children: job.address || "—" },
        { key: "experience", label: "Kinh nghiệm tối thiểu", children: job.min_experience_months == null ? "—" : `${job.min_experience_months} tháng` },
      ]} />
        <Collapse items={[["description", "Mô tả công việc"], ["requirements", "Yêu cầu ứng viên"], ["benefits", "Quyền lợi"]].map(([key, label]) => ({
          key, label, children: <p className="preserve-text job-body-text">{job[key] || "Chưa bổ sung thông tin."}</p>,
        }))} />
        {jobSkills.length > 0 && <div className="job-skills-display snapshot-section">{jobSkills.map((item) => <Tag key={item.skill_id || item.id}>
          {item.skill?.name || item.name || "Kỹ năng #" + item.skill_id}{item.is_required ? " · Bắt buộc" : " · Ưu tiên"}
        </Tag>)}</div>}
      </Card>
    </div>
    <Modal title="Rút đơn ứng tuyển?" open={confirmOpen} onCancel={() => { if (!operation.current) setConfirmOpen(false); }} onOk={withdraw}
      okText="Rút đơn" cancelText="Hủy" okButtonProps={{ danger: true }} confirmLoading={saving} cancelButtonProps={{ disabled: saving }}
      closable={!saving} keyboard={!saving} mask={{ closable: !saving }}>
      <p>Bạn sẽ rút hồ sơ khỏi vị trí này. Mỗi ứng viên chỉ nộp một lần cho một tin, kể cả khi đã rút đơn.</p>
      {error && <Alert type="error" role="alert" showIcon title={error} />}
    </Modal>
  </section>;
}

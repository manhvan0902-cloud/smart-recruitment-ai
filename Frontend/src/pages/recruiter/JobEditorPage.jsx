import { useEffect, useRef, useState } from "react";
import { Alert, App, Button, Card, Form, Space, Spin } from "antd";
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { Link, useNavigate, useParams } from "react-router-dom";
import JobValidationAlert from "../../components/JobValidationAlert";
import StatusTag from "../../components/StatusTag";
import {
  closeRecruiterJob, createRecruiterJob, getRecruiterCatalog, getRecruiterJob,
  publishRecruiterJob, replaceRecruiterJobSkills, updateRecruiterJob,
} from "../../services/recruiterService";
import { hydrateRecruiterJob, jobFormValues, jobRequestBody } from "../../utils/jobs";
import JobInformationForm from "./JobInformationForm";
import JobSkillsForm from "./JobSkillsForm";

const emptyCatalog = { industries: [], locations: [], jobLevels: [], employmentTypes: [], skills: [] };

export default function JobEditorPage() {
  const { jobId } = useParams();
  const isNew = !jobId;
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();
  const [job, setJob] = useState(null);
  const [catalog, setCatalog] = useState(emptyCatalog);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(null);
  const [mainDirty, setMainDirty] = useState(false);
  const [skillsDirty, setSkillsDirty] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const operation = useRef(null);
  const confirmation = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    setActionError("");
    setConflict(false);
    setJob(null);
    setMainDirty(false);
    setSkillsDirty(false);
    document.title = (isNew ? "Tạo tin tuyển dụng" : "Chi tiết tin tuyển dụng") + " | Smart Recruitment";

    Promise.all([getRecruiterCatalog(controller.signal), isNew ? Promise.resolve(null) : getRecruiterJob(jobId, controller.signal)])
      .then(([catalogResult, jobResult]) => {
        if (controller.signal.aborted) return;
        setCatalog(catalogResult.data);
        setJob(jobResult?.data || null);
        form.resetFields();
        form.setFieldsValue(jobFormValues(jobResult?.data));
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [jobId, isNew, refreshCount, form]);

  useEffect(() => {
    setBusy(null);
    return () => {
      operation.current?.abort();
      confirmation.current?.destroy();
    };
  }, [jobId]);

  const ready = !loading && !loadError && (isNew || String(job?.id) === jobId);
  const dirty = mainDirty || skillsDirty;
  const disabled = !ready || Boolean(busy);

  function reloadJob() {
    if (operation.current) return;
    const reload = () => setRefreshCount((value) => value + 1);
    if (dirty) {
      confirmation.current = modal.confirm({ title: "Tải lại tin tuyển dụng?", content: "Các thay đổi chưa lưu sẽ được thay bằng dữ liệu mới từ máy chủ.",
        okText: "Tải bản mới", cancelText: "Giữ chỉnh sửa", onOk: reload });
      return;
    }
    reload();
  }

  function applySavedJob(saved) {
    const next = hydrateRecruiterJob(job, saved, catalog);
    setJob(next);
    form.resetFields();
    form.setFieldsValue(jobFormValues(next));
    setMainDirty(false);
    setConflict(false);
  }

  function showMutationError(error) {
    setActionError(error.message);
    if (error.code === "REVISION_CONFLICT") setConflict(true);
  }

  async function handleSave(values) {
    if (operation.current || disabled || conflict) return;
    const body = jobRequestBody(values);
    if (job) {
      const originalValues = jobFormValues(job);
      const original = jobRequestBody(originalValues);
      for (const field of Object.keys(body)) {
        if (body[field] === original[field]) delete body[field];
      }
      if (values.application_deadline === originalValues.application_deadline) delete body.application_deadline;
      if (!Object.keys(body).length) {
        setMainDirty(false);
        message.info("Thông tin tin tuyển dụng chưa có thay đổi.");
        return;
      }
      body.revision = job.revision;
    }

    const controller = new AbortController();
    operation.current = controller;
    setBusy("save");
    setActionError("");
    try {
      const result = isNew ? await createRecruiterJob(body, controller.signal) : await updateRecruiterJob(jobId, body, controller.signal);
      if (controller.signal.aborted) return;
      if (isNew) {
        message.success("Đã tạo tin nháp. Bạn có thể bổ sung kỹ năng và đăng tin.");
        navigate("/recruiter/jobs/" + result.data.id, { replace: true });
      } else {
        applySavedJob(result.data);
        message.success("Đã lưu thông tin tin tuyển dụng.");
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error.status === 422 && error.response?.data) {
        applySavedJob(error.response.data);
        message.warning("Thông tin đã được lưu. Tin cần bổ sung trước khi hiển thị cho ứng viên.");
      } else showMutationError(error);
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  async function handleSkillsSave(skills) {
    if (operation.current || disabled || conflict || !job) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy("skills");
    setActionError("");
    const body = { revision: job.revision, skills };
    let committed;
    let fields = [];
    try {
      committed = await replaceRecruiterJobSkills(jobId, body, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error.status === 422 && error.response?.revision) {
        committed = error.response;
        fields = error.fields;
      } else {
        showMutationError(error);
        return;
      }
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) setBusy(null);
    }
    if (controller.signal.aborted) return;
    const savedSkills = committed.data.map((item) => {
      const skill = catalog.skills.find((entry) => String(entry.id) === String(item.skill_id));
      return { id: item.skill_id, name: skill?.name || "Kỹ năng", Job_skill: { is_required: item.is_required, importance: item.importance } };
    });
    setJob((current) => ({ ...current, revision: committed.revision, skills: savedSkills,
      ...(fields.length ? { status: "NEEDS_CHANGES", validation_errors: fields } : {}),
      ...(current.status === "PUBLISHED" && !fields.length ? { validation_errors: null } : {}),
    }));
    setSkillsDirty(false);
    if (fields.length) message.warning("Đã lưu kỹ năng. Tin cần bổ sung trước khi hiển thị cho ứng viên.");
    else message.success("Đã lưu kỹ năng yêu cầu.");
  }

  async function changeStatus(action) {
    if (operation.current || disabled || dirty || conflict || !job) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(action);
    setActionError("");
    try {
      const result = action === "publish" ? await publishRecruiterJob(jobId, controller.signal) : await closeRecruiterJob(jobId, controller.signal);
      if (controller.signal.aborted) return;
      applySavedJob(result.data);
      message.success(action === "publish" ? "Đã đăng tin tuyển dụng." : "Đã đóng tin tuyển dụng.");
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error.status === 422 && error.response?.data) {
        applySavedJob(error.response.data);
        message.warning("Tin chưa đủ điều kiện đăng. Hãy bổ sung theo danh sách hệ thống trả về.");
      } else showMutationError(error);
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  const canPublish = job && ["DRAFT", "NEEDS_CHANGES", "CLOSED", "EXPIRED"].includes(job.status);
  const canClose = job && ["DRAFT", "NEEDS_CHANGES", "PUBLISHED"].includes(job.status);

  function confirmClose() {
    confirmation.current = modal.confirm({
      title: "Đóng tin tuyển dụng?",
      content: "Tin sẽ ngừng nhận hồ sơ và ngừng xuất hiện trong kết quả tìm việc.",
      okText: "Đóng tin",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => changeStatus("close"),
    });
  }

  return (
    <section>
      <Link className="back-link" to="/recruiter/jobs"><ArrowLeftOutlined /> Tin tuyển dụng</Link>
      <div className="page-heading page-heading-with-actions">
        <div><h1>{isNew ? "Tạo tin tuyển dụng" : "Chi tiết tin tuyển dụng"}</h1>{job && <StatusTag status={job.status} />}</div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} disabled={loading || Boolean(busy)} onClick={reloadJob}>Tải lại</Button>
          {canPublish && <Button type="primary" icon={<CheckOutlined />} loading={busy === "publish"}
            disabled={disabled || dirty || conflict || job.company?.verification_status !== "VERIFIED"} onClick={() => changeStatus("publish")}>Đăng tin</Button>}
          {canClose && <Button danger icon={<CloseOutlined />} disabled={disabled || dirty || conflict}
            onClick={confirmClose}>Đóng tin</Button>}
        </Space>
      </div>
      {loadError && <Alert className="form-alert" type="error" showIcon role="alert" title={loadError} action={<Button onClick={reloadJob}>Thử lại</Button>} />}
      {actionError && <Alert className="form-alert" type="error" showIcon role="alert" title={actionError}
        action={conflict ? <Button onClick={reloadJob}>Tải bản mới</Button> : undefined} />}
      {job?.company?.verification_status !== "VERIFIED" && job && <Alert className="form-alert" type="info" showIcon
        title="Công ty cần được xác minh trước khi đăng tin." description={<Link to="/recruiter/profile">Xem hồ sơ công ty</Link>} />}
      {dirty && !isNew && <Alert className="form-alert" type="info" showIcon title="Lưu các thay đổi thông tin và kỹ năng trước khi đăng hoặc đóng tin." />}
      <JobValidationAlert fields={job?.validation_errors} />
      <Spin spinning={loading}>
        <div className="job-editor-sections">
          <Card title="Thông tin tin tuyển dụng">
            <JobInformationForm form={form} job={job} catalog={catalog} disabled={disabled} saving={busy === "save"}
              conflict={conflict} onSave={handleSave} onDirty={setMainDirty} />
          </Card>
          {job && <Card title="Kỹ năng yêu cầu"><JobSkillsForm job={job} catalog={catalog} disabled={disabled}
            saving={busy === "skills"} conflict={conflict} onSave={handleSkillsSave} onDirty={setSkillsDirty} /></Card>}
          {isNew && <Alert type="info" showIcon title="Sau khi lưu tin nháp, bạn có thể thêm kỹ năng yêu cầu và đăng tin." />}
        </div>
      </Spin>
    </section>
  );
}

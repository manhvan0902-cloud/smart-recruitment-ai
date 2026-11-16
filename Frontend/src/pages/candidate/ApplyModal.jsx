import { useEffect, useRef, useState } from "react";
import { Alert, App, Button, Empty, Form, Input, Modal, Pagination, Select } from "antd";
import { Link } from "react-router-dom";
import usePaginatedList from "../../hooks/usePaginatedList";
import { applyToCandidateJob, getCandidateProfile, listCandidateCvs } from "../../services/candidateService";
import { formatDateTime } from "../../utils/format";

export default function ApplyModal({ job, onClose, onApplied }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const cvs = usePaginatedList(listCandidateCvs, { page: 1, limit: 10 });
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [profileRefresh, setProfileRefresh] = useState(0);
  const [selectedCv, setSelectedCv] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const operation = useRef(null);
  useEffect(() => () => operation.current?.abort(), []);

  useEffect(() => {
    const controller = new AbortController();
    setProfileLoading(true);
    setProfileError(null);
    getCandidateProfile(controller.signal)
      .then((result) => { if (!controller.signal.aborted) setProfile(result.data); })
      .catch((requestError) => { if (!controller.signal.aborted) setProfileError(requestError); })
      .finally(() => { if (!controller.signal.aborted) setProfileLoading(false); });
    return () => controller.abort();
  }, [profileRefresh]);

  function reloadCvs() {
    form.setFieldValue("cvId", undefined);
    setSelectedCv(null);
    cvs.reload();
  }

  async function handleSubmit(values) {
    if (operation.current || !profile || profileLoading || profileError || cvs.loading || cvs.error) return;
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    setError(null);
    try {
      const result = await applyToCandidateJob(job.id, { cvId: values.cvId, coverLetter: values.coverLetter?.trim() || null }, controller.signal);
      if (controller.signal.aborted) return;
      message.success("Đã gửi hồ sơ ứng tuyển.");
      onApplied(result.data);
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError);
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  const options = cvs.rows.map((cv) => ({ value: String(cv.id), label: cv.name + " — " + formatDateTime(cv.created_at) }));
  if (selectedCv && !options.some((item) => item.value === selectedCv.value)) options.push(selectedCv);
  const disabled = saving || profileLoading || Boolean(profileError) || !profile || cvs.loading || Boolean(cvs.error) || !cvs.total;

  return <Modal title="Ứng tuyển việc làm" open onCancel={() => { if (!operation.current) onClose(); }} onOk={() => form.submit()}
    okText="Gửi hồ sơ" cancelText="Hủy" confirmLoading={saving} okButtonProps={{ disabled }} cancelButtonProps={{ disabled: saving }}
    closable={!saving} keyboard={!saving} mask={{ closable: !saving }}>
    <p className="modal-subject">{job.title} · {job.company?.name}</p>
    {profile && !profileError && <p className="section-help">Hồ sơ của {profile.full_name} và CV được chọn sẽ được lưu tại thời điểm gửi. <Link to="/candidate/profile">Xem hồ sơ cá nhân</Link></p>}
    {profileError && <Alert className="form-alert" type="error" showIcon role="alert" title={profileError.message}
      description={profileError.code === "PROFILE_NOT_FOUND" ? <Link to="/candidate/profile">Tạo hồ sơ cá nhân</Link> : undefined}
      action={<Button onClick={() => setProfileRefresh((value) => value + 1)}>Thử lại</Button>} />}
    {error && <Alert className="form-alert" type="error" showIcon role="alert" title={error.message}
      description={error.code === "ALREADY_APPLIED" ? <Link to="/candidate/applications">Xem các đơn đã nộp</Link> : undefined} />}
    {cvs.error && <Alert className="form-alert" type="error" showIcon role="alert" title={cvs.error} action={<Button onClick={reloadCvs}>Tải lại CV</Button>} />}
    {!cvs.loading && !cvs.error && !cvs.total && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bạn cần tải CV trước khi ứng tuyển."><Link to="/candidate/cvs"><Button>Tải CV lên</Button></Link></Empty>}
    <Form form={form} name="apply-job" layout="vertical" disabled={saving} requiredMark={false} onFinish={handleSubmit}>
      <Form.Item name="cvId" label="Chọn CV đang hoạt động" rules={[{ required: true, message: "Chọn CV để ứng tuyển." }]}>
        <Select loading={cvs.loading} disabled={saving || cvs.loading || Boolean(cvs.error)} placeholder="Chọn CV" options={options}
          onChange={(_, option) => setSelectedCv({ value: option.value, label: option.label })} />
      </Form.Item>
      {cvs.total > 10 && <Pagination className="cv-picker-pagination" size="small" current={cvs.query.page} pageSize={10} total={cvs.total}
        showSizeChanger={false} disabled={saving || cvs.loading} onChange={(page) => cvs.setQuery((current) => ({ ...current, page }))} />}
      <div className="cv-picker-links"><Button type="link" onClick={reloadCvs} disabled={saving || cvs.loading}>Tải lại danh sách CV</Button><Link to="/candidate/cvs">Quản lý CV</Link></div>
      <Form.Item name="coverLetter" label="Thư giới thiệu" rules={[{ max: 65535, message: "Thư giới thiệu tối đa 65.535 ký tự." }]}>
        <Input.TextArea maxLength={65535} autoSize={{ minRows: 4, maxRows: 10 }} placeholder="Giới thiệu ngắn về kinh nghiệm và lý do bạn phù hợp với vị trí" />
      </Form.Item>
    </Form>
  </Modal>;
}

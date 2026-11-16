import { useState } from "react";
import { Alert, Button, Empty, Modal, Pagination, Select } from "antd";
import { Link, useNavigate } from "react-router-dom";
import usePaginatedList from "../../hooks/usePaginatedList";
import { listCandidateCvs } from "../../services/candidateService";
import { formatDateTime } from "../../utils/format";

export default function MatchCvPickerModal({ job, onClose }) {
  const navigate = useNavigate();
  const cvs = usePaginatedList(listCandidateCvs, { page: 1, limit: 10 });
  const [selected, setSelected] = useState(null);
  const selectedOnPage = cvs.rows.find((cv) => String(cv.id) === selected?.value);
  const canContinue = Boolean(selected) && (!selectedOnPage || selectedOnPage.processing_status === "READY");
  const options = cvs.rows.map((cv) => ({ value: String(cv.id), label: cv.name + " — " + formatDateTime(cv.created_at) + (cv.processing_status === "READY" ? "" : " · Chưa sẵn sàng"), disabled: cv.processing_status !== "READY" }));
  if (selected && !options.some((option) => option.value === selected.value)) options.push(selected);
  return <Modal open title="Chọn CV để đối chiếu" okText="Tiếp tục" cancelText="Hủy" onCancel={onClose} okButtonProps={{ disabled: !canContinue || cvs.loading || Boolean(cvs.error) }}
    onOk={() => { if (canContinue && !cvs.loading && !cvs.error) navigate("/candidate/cvs/" + selected.value + "/matches?jobId=" + job.id); }}>
    <p className="modal-subject">{job.title} · {job.company?.name}</p>
    <p className="section-help">Chọn CV đã trích xuất văn bản thành công. Bạn sẽ xem lại lựa chọn trước khi bắt đầu đối chiếu.</p>
    {cvs.error && <Alert className="form-alert" type="error" showIcon role="alert" title={cvs.error}
      action={<Button onClick={() => { setSelected(null); cvs.reload(); }}>Thử lại</Button>} />}
    {!cvs.loading && !cvs.error && !cvs.total ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bạn chưa có CV đang hoạt động." /> : <>
      <label className="field-label" htmlFor="cv-match-picker">CV đã trích xuất</label>
      <Select id="cv-match-picker" className="full-width" value={selected?.value} options={options} loading={cvs.loading} disabled={cvs.loading || Boolean(cvs.error)} placeholder="Chọn CV"
        onChange={(_, option) => setSelected({ value: option.value, label: option.label })} />
      {cvs.total > 10 && <Pagination className="cv-picker-pagination" size="small" current={cvs.query.page} pageSize={10} total={cvs.total} showSizeChanger={false}
        disabled={cvs.loading} onChange={(page) => cvs.setQuery((current) => ({ ...current, page }))} />}
    </>}
    <div className="cv-picker-links"><Button type="link" disabled={cvs.loading} onClick={() => { setSelected(null); cvs.reload(); }}>Tải lại CV</Button>
      <Link to="/candidate/cvs">Quản lý / Trích xuất CV</Link></div>
  </Modal>;
}

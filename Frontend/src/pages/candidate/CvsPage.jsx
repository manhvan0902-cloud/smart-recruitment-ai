import { useEffect, useRef, useState } from "react";
import { Alert, App, Button, Card, Empty, Modal, Space, Table } from "antd";
import { InboxOutlined, ReloadOutlined, UploadOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import CvDownloadButton from "../../components/CvDownloadButton";
import StatusTag from "../../components/StatusTag";
import usePaginatedList from "../../hooks/usePaginatedList";
import { archiveCandidateCv, getCandidateCvDownload, listCandidateCvs } from "../../services/candidateService";
import { formatDateTime, formatFileSize } from "../../utils/format";
import CvUploadModal from "./CvUploadModal";

export default function CvsPage() {
  const { message } = App.useApp();
  const list = usePaginatedList(listCandidateCvs, { page: 1, limit: 10 });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef(null);
  useEffect(() => { document.title = "CV của tôi | Smart Recruitment"; return () => operation.current?.abort(); }, []);

  async function archiveCv() {
    if (operation.current || !target) return;
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    setError("");
    try {
      await archiveCandidateCv(target.id, controller.signal);
      if (controller.signal.aborted) return;
      setTarget(null);
      list.reload();
      message.success("Đã lưu trữ CV.");
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError.message);
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  const columns = [
    { title: "CV", key: "name", width: 290, render: (_, cv) => <div className="table-identity"><Link className="table-title-link" to={"/candidate/cvs/" + cv.id}>{cv.name}</Link>
      <span className="table-secondary">{cv.fileAsset?.original_name || "Tệp PDF"} · {formatFileSize(cv.fileAsset?.byte_size)}</span></div> },
    { title: "Trạng thái", dataIndex: "processing_status", width: 170, render: (status) => <StatusTag status={status} /> },
    { title: "Ngày tải lên", dataIndex: "created_at", width: 190, render: formatDateTime },
    { title: "Thao tác", key: "actions", width: 390, render: (_, cv) => <Space wrap>
      <Link to={"/candidate/cvs/" + cv.id}><Button disabled={saving}>Trích xuất / Chi tiết</Button></Link>
      <Link to={"/candidate/cvs/" + cv.id + "/matches"}><Button disabled={saving}>Đối chiếu</Button></Link>
      <CvDownloadButton load={(signal) => getCandidateCvDownload(cv.id, signal)} disabled={list.loading || saving} />
      <Button icon={<InboxOutlined />} disabled={list.loading || saving || cv.processing_status === "PROCESSING"}
        onClick={() => { setError(""); setTarget(cv); }}>Lưu trữ</Button>
    </Space> },
  ];

  return <section>
    <div className="page-heading page-heading-with-actions"><div><h1>CV của tôi</h1><p>CV đã tải lên có thể dùng để ứng tuyển ngay.</p></div>
      <Space wrap><Button icon={<ReloadOutlined />} onClick={list.reload} disabled={list.loading || saving}>Tải lại</Button>
        <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadOpen(true)} disabled={saving}>Tải CV lên</Button></Space></div>
    {list.error && <Alert className="form-alert" type="error" showIcon role="alert" title={list.error} action={<Button onClick={list.reload}>Thử lại</Button>} />}
    <Card className="data-table-card"><Table rowKey={(cv) => String(cv.id)} columns={columns} dataSource={list.rows} loading={list.loading} scroll={{ x: 1080 }}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={list.error ? "Chưa tải được danh sách CV." : "Bạn chưa có CV đang hoạt động."} /> }}
      pagination={{ current: list.query.page, pageSize: list.query.limit, total: list.total, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100] }}
      onChange={(pagination) => list.setQuery((current) => ({ ...current, page: pagination.current, limit: pagination.pageSize }))} /></Card>
    {uploadOpen && <CvUploadModal onClose={() => setUploadOpen(false)} onUploaded={() => { setUploadOpen(false); list.setQuery((current) => ({ ...current, page: 1 })); }} />}
    <Modal title="Lưu trữ CV?" open={Boolean(target)} onCancel={() => { if (!operation.current) setTarget(null); }} onOk={archiveCv}
      okText="Lưu trữ" cancelText="Hủy" confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving} keyboard={!saving} mask={{ closable: !saving }}>
      <p className="modal-subject">{target?.name}</p><p>CV sẽ được gỡ khỏi danh sách chọn cho các đơn mới. Hồ sơ đã ứng tuyển vẫn giữ bản CV đã nộp.</p>
      {error && <Alert type="error" showIcon role="alert" title={error} />}
    </Modal>
  </section>;
}

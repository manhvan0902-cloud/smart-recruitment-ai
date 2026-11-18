import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, App, Button, Card, Collapse, Descriptions, Modal, Result, Skeleton, Space } from "antd";
import { ArrowLeftOutlined, InboxOutlined, ReloadOutlined } from "@ant-design/icons";
import { Link, useParams } from "react-router-dom";
import CvDownloadButton from "../../components/CvDownloadButton";
import StatusTag from "../../components/StatusTag";
import CvProcessingCard from "../../components/CvProcessingCard";
import CvAiAnalysisCard from "../../components/CvAiAnalysisCard";
import { archiveCandidateCv, getCandidateCv, getCandidateCvDownload } from "../../services/candidateService";
import { formatDateTime, formatFileSize } from "../../utils/format";

export default function CvDetailsPage() {
  const { cvId } = useParams();
  return <CvDetails key={cvId} cvId={cvId} />;
}

function CvDetails({ cvId }) {
  const { message } = App.useApp();
  const [cv, setCv] = useState(null);
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [parseBusy, setParseBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  const hasLoaded = useRef(false);
  const operation = useRef(null);
  const reload = useCallback(() => setRefreshCount((value) => value + 1), []);
  useEffect(() => {
    setSaving(false);
    return () => operation.current?.abort();
  }, [cvId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(!hasLoaded.current);
    setRefreshing(true);
    setLoadError(null);
    setConfirmOpen(false);
    setError("");
    document.title = "Chi tiết CV | Smart Recruitment";
    getCandidateCv(cvId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setCv(result.data);
        hasLoaded.current = true;
        setRawText(result.rawText || "");
        document.title = result.data.name + " | Smart Recruitment";
      })
      .catch((requestError) => { if (!controller.signal.aborted) setLoadError(requestError); })
      .finally(() => { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); } });
    return () => controller.abort();
  }, [cvId, refreshCount]);

  useEffect(() => { if (parseBusy) setPollAttempts(0); }, [parseBusy]);

  useEffect(() => {
    if (!["PROCESSING", "QUEUED"].includes(cv?.processing_status) || parseBusy || refreshing || loadError || pollAttempts >= 20) return;
    const timer = window.setTimeout(() => { setPollAttempts((value) => value + 1); reload(); }, 3000);
    return () => window.clearTimeout(timer);
  }, [cv?.processing_status, parseBusy, refreshing, loadError, pollAttempts, reload]);

  async function archiveCv() {
    if (operation.current || !cv) return;
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    setError("");
    try {
      await archiveCandidateCv(cvId, controller.signal);
      if (controller.signal.aborted) return;
      setConfirmOpen(false);
      setRefreshCount((value) => value + 1);
      message.success("Đã lưu trữ CV.");
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError.message);
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  if (loading) return <Card><Skeleton active /></Card>;
  if (loadError?.status === 404) return <Result status="404" title="Không tìm thấy CV" extra={<Link to="/candidate/cvs"><Button>Về CV của tôi</Button></Link>} />;
  if (loadError && !cv) return <Alert type="error" showIcon role="alert" title={loadError.message} action={<Button onClick={reload}>Thử lại</Button>} />;
  if (!cv) return null;

  return <section>
    <Link className="back-link" to="/candidate/cvs"><ArrowLeftOutlined /> CV của tôi</Link>
    <div className="page-heading page-heading-with-actions"><div><h1>{cv.name}</h1><StatusTag status={cv.processing_status} /></div>
      <Space wrap><Button icon={<ReloadOutlined />} loading={refreshing} onClick={() => { setPollAttempts(0); reload(); }} disabled={saving || parseBusy || aiBusy || refreshing}>Tải lại</Button>
        <CvDownloadButton key={cvId} load={(signal) => getCandidateCvDownload(cvId, signal)} disabled={Boolean(cv.archived_at) || saving || parseBusy || aiBusy} />
        {!cv.archived_at && <Button icon={<InboxOutlined />} onClick={() => setConfirmOpen(true)} disabled={saving || parseBusy || aiBusy || refreshing || Boolean(loadError) || cv.processing_status === "PROCESSING"}>Lưu trữ</Button>}</Space></div>
    {loadError && <Alert className="form-alert" type="error" showIcon role="alert" title={loadError.message} action={<Button disabled={parseBusy || saving || refreshing} onClick={reload}>Thử lại</Button>} />}
    {pollAttempts >= 20 && ["PROCESSING", "QUEUED"].includes(cv.processing_status) && <Alert className="form-alert" type="info" showIcon title="Chưa nhận được kết quả xử lý. Bấm Tải lại để kiểm tra tiếp." />}
    {cv.archived_at && <Alert className="form-alert" type="info" showIcon title="CV đã lưu trữ. Bạn có thể xem lại thông tin, các đơn mới sử dụng CV đang hoạt động trong danh sách CV của tôi." />}
    <CvProcessingCard cv={cv} disabled={saving || aiBusy || refreshing || Boolean(loadError)} onBusy={setParseBusy} onChanged={reload} />
    <CvAiAnalysisCard cv={cv} disabled={saving || parseBusy || refreshing || Boolean(loadError)} onBusy={setAiBusy} onChanged={reload} />
    <Card title="Thông tin tệp"><Descriptions column={1} items={[
      { key: "file", label: "Tên tệp", children: cv.fileAsset?.original_name || "—" },
      { key: "size", label: "Dung lượng", children: formatFileSize(cv.fileAsset?.byte_size) },
      { key: "type", label: "Định dạng", children: "PDF" },
      { key: "date", label: "Ngày tải lên", children: formatDateTime(cv.created_at) },
      { key: "parsed", label: "Ngày trích xuất", children: formatDateTime(cv.parsed_at) },
    ]} /></Card>
    {rawText && <Collapse className="cv-text-collapse" items={[{ key: "text", label: cv.processing_status === "READY" && !parseBusy ? "Văn bản đã trích xuất" : "Văn bản từ lần trích xuất trước", children: <pre className="cv-raw-text">{rawText}</pre> }]} />}
    <Modal title="Lưu trữ CV?" open={confirmOpen} onCancel={() => { if (!operation.current) setConfirmOpen(false); }} onOk={archiveCv}
      okText="Lưu trữ" cancelText="Hủy" confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving} keyboard={!saving} mask={{ closable: !saving }}>
      <p>CV sẽ ngừng xuất hiện trong danh sách chọn khi ứng tuyển mới. Các đơn đã nộp vẫn giữ hồ sơ tại thời điểm gửi.</p>
      {error && <Alert type="error" showIcon role="alert" title={error} />}
    </Modal>
  </section>;
}

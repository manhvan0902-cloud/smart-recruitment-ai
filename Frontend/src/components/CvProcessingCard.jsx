import { useEffect, useRef, useState } from "react";
import { Alert, App, Button, Card, Descriptions, Modal, Space, Spin } from "antd";
import { FileSearchOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { parseCandidateCv } from "../services/candidateService";
import { formatDateTime } from "../utils/format";
import StatusTag from "./StatusTag";

export default function CvProcessingCard({ cv, disabled, onChanged, onBusy }) {
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState(null);
  const operation = useRef(null);
  const inProgress = saving || ["PROCESSING", "QUEUED"].includes(cv.processing_status);
  const canParse = !cv.archived_at && ["UPLOADED", "READY", "FAILED"].includes(cv.processing_status);
  useEffect(() => () => { operation.current?.abort(); onBusy(false); }, [onBusy]);

  async function parse() {
    if (operation.current || disabled || !canParse) return;
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    onBusy(true);
    setError(null);
    setConfirmOpen(false);
    try {
      await parseCandidateCv(cv.id, controller.signal);
      if (controller.signal.aborted) return;
      message.success("Đã trích xuất văn bản CV.");
      onChanged();
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setError(requestError);
        // A disconnected request may still finish on the server; read its state.
        onChanged();
      }
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) { setSaving(false); onBusy(false); }
    }
  }

  return <Card title="Trích xuất văn bản CV" className="cv-processing-card">
    <p className="section-help">Lấy văn bản từ PDF để đối chiếu kỹ năng. Bạn vẫn có thể ứng tuyển bằng CV chưa trích xuất.</p>
    <Alert className="form-alert" type="info" showIcon title="Trích xuất văn bản PDF, chưa phân tích bằng mô hình AI."
      description="Hãy dùng PDF tối đa 100 trang, có thể chọn hoặc sao chép văn bản. PDF chỉ chứa ảnh cần được nhận dạng chữ trước khi tải lên." />
    <Descriptions column={1} items={[
      { key: "status", label: "Trạng thái", children: saving ? <Space><Spin size="small" /> Đang trích xuất</Space> : <StatusTag status={cv.processing_status} /> },
      { key: "version", label: "Phiên bản văn bản", children: Number(cv.extraction_version) || "Chưa trích xuất" },
      { key: "date", label: "Lần trích xuất gần nhất", children: formatDateTime(cv.parsed_at) },
    ]} />
    {inProgress && <Alert className="form-alert" type="info" showIcon title="CV đang được xử lý. Vui lòng chờ kết quả."
      description={saving ? "Thao tác có thể mất thời gian để tải tệp và đọc văn bản." : "Trang sẽ kiểm tra lại trạng thái trong thời gian ngắn. Nếu chưa có kết quả, bạn có thể tải lại thủ công."} />}
    {cv.processing_status === "FAILED" && <Alert className="form-alert" type="warning" showIcon title={cv.error_message || "Lần trích xuất gần nhất không thành công."}
      description="Kiểm tra PDF có lớp văn bản. Bạn có thể thử lại, hoặc tải lên một tệp PDF khác." />}
    {error && <Alert className="form-alert" type="error" showIcon role="alert" title={error.message}
      description={error.code === "CV_HAS_NO_TEXT" ? "PDF không có lớp văn bản. Hãy tải CV dạng văn bản thay cho bản scan hoặc ảnh."
        : "Trạng thái CV được tải lại sau lỗi. Nếu mất kết nối, hãy kiểm tra trạng thái trước khi gửi yêu cầu mới."} />}
    <Space wrap>
      {!cv.archived_at && <Button type="primary" icon={<FileSearchOutlined />} loading={saving} disabled={disabled || !canParse || saving}
        onClick={() => { if (cv.processing_status === "READY") setConfirmOpen(true); else parse(); }}>
        {cv.processing_status === "FAILED" ? "Thử trích xuất lại" : cv.processing_status === "READY" ? "Trích xuất lại" : "Trích xuất văn bản"}</Button>}
      <Link to={"/candidate/cvs/" + cv.id + "/matches"}><Button disabled={saving}>Đối chiếu kỹ năng / Xem kết quả</Button></Link>
    </Space>
    <Modal open={confirmOpen} title="Trích xuất lại CV?" okText="Trích xuất lại" cancelText="Hủy" onOk={parse} onCancel={() => setConfirmOpen(false)} okButtonProps={{ disabled }}>
      <p>Một phiên bản văn bản mới sẽ được tạo nếu thành công. Các kết quả đối chiếu trước đó vẫn được giữ và sẽ hiển thị là dùng phiên bản cũ.</p>
    </Modal>
  </Card>;
}

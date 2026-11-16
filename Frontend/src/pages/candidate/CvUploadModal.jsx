import { useEffect, useRef, useState } from "react";
import { Alert, App, Form, Input, Modal, Upload } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { uploadCandidateCv } from "../../services/candidateService";

export default function CvUploadModal({ onClose, onUploaded }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [needsProfile, setNeedsProfile] = useState(false);
  const operation = useRef(null);
  useEffect(() => () => operation.current?.abort(), []);

  function selectFile(selected) {
    if (selected.type !== "application/pdf" || !/\.pdf$/i.test(selected.name)) {
      setError("Chỉ chấp nhận tệp PDF có đuôi .pdf.");
      return Upload.LIST_IGNORE;
    }
    if (selected.size <= 0 || selected.size > 10 * 1024 * 1024) {
      setError("CV cần có dung lượng lớn hơn 0 và tối đa 10 MB.");
      return Upload.LIST_IGNORE;
    }
    setFile(selected);
    setError("");
    if (!form.getFieldValue("name")) form.setFieldValue("name", selected.name.replace(/\.pdf$/i, "").slice(0, 200) || "CV của tôi");
    return false;
  }

  async function handleSubmit(values) {
    if (operation.current) return;
    if (!file) { setError("Vui lòng chọn tệp CV PDF."); return; }
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    setError("");
    try {
      const result = await uploadCandidateCv(file, values.name.trim(), controller.signal);
      if (controller.signal.aborted) return;
      message.success("Đã tải CV lên.");
      onUploaded(result.data);
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setError(requestError.message);
      setNeedsProfile(requestError.code === "PROFILE_NOT_FOUND");
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  return (
    <Modal title="Tải CV lên" open onCancel={() => { if (!operation.current) onClose(); }} onOk={() => form.submit()}
      okText="Tải CV lên" cancelText="Hủy" confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving} keyboard={!saving} mask={{ closable: !saving }}>
      {error && <Alert className="form-alert" type="error" showIcon role="alert" title={error}
        description={needsProfile ? <Link to="/candidate/profile">Tạo hồ sơ cá nhân trước khi tải CV</Link> : undefined} />}
      <Form form={form} name="upload-cv" layout="vertical" requiredMark={false} disabled={saving} onFinish={handleSubmit}>
        <Form.Item label="Tệp CV PDF" required>
          <Upload.Dragger accept="application/pdf,.pdf" maxCount={1} fileList={file ? [file] : []} beforeUpload={selectFile}
            disabled={saving} onRemove={() => { setFile(null); return true; }}>
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Chọn hoặc kéo thả tệp PDF</p>
            <p className="ant-upload-hint">Dung lượng tối đa 10 MB</p>
          </Upload.Dragger>
        </Form.Item>
        <Form.Item name="name" label="Tên CV" rules={[{ required: true, whitespace: true, message: "Nhập tên CV." }, { max: 200, message: "Tên CV tối đa 200 ký tự." }]}>
          <Input maxLength={200} placeholder="Ví dụ CV ứng tuyển lập trình viên" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, App, Button, Descriptions, Empty, Form, Input, Modal, Space, Table } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { profileSections, validDateOnly } from "../../config/profileSections";
import usePaginatedList from "../../hooks/usePaginatedList";
import { deleteProfileRecord, listProfileRecords, saveProfileRecord } from "../../services/candidateService";
import { formatDateOnly, getWebsiteUrl } from "../../utils/format";

export default function ProfileRecordsSection({ resource }) {
  const section = profileSections[resource];
  const load = useCallback((query, signal) => listProfileRecords(resource, query, signal), [resource]);
  const list = usePaginatedList(load, { page: 1, limit: 10 });
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [editor, setEditor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef(null);
  useEffect(() => () => operation.current?.abort(), []);

  function openEditor(record = null) {
    if (operation.current) return;
    form.resetFields();
    const values = {};
    for (const field of section.fields) values[field.name] = record?.[field.name] || "";
    form.setFieldsValue(values);
    setError("");
    setEditor({ record });
  }

  function closeDialogs() {
    if (operation.current) return;
    setEditor(null);
    setDeleteTarget(null);
    setError("");
  }

  async function handleSave(values) {
    if (operation.current || !editor) return;
    const body = {};
    for (const field of section.fields) body[field.name] = values[field.name]?.trim() || null;
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    setError("");
    try {
      await saveProfileRecord(resource, editor.record?.id, body, controller.signal);
      if (controller.signal.aborted) return;
      setEditor(null);
      message.success("Đã lưu " + section.singular + ".");
      if (editor.record) list.reload();
      else list.setQuery((current) => ({ ...current, page: 1 }));
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError.message);
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  async function handleDelete() {
    if (operation.current || !deleteTarget) return;
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    setError("");
    try {
      await deleteProfileRecord(resource, deleteTarget.id, controller.signal);
      if (controller.signal.aborted) return;
      setDeleteTarget(null);
      message.success("Đã xóa " + section.singular + ".");
      list.reload();
    } catch (requestError) {
      if (controller.signal.aborted) return;
      if (requestError.code === "RECORD_NOT_FOUND") { setDeleteTarget(null); list.reload(); }
      else setError(requestError.message);
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  function fieldRules(field) {
    const rules = [{ required: Boolean(field.required), whitespace: Boolean(field.required), message: "Vui lòng nhập " + field.label.toLowerCase() + "." }];
    if (field.max) rules.push({ max: field.max, message: `${field.label} tối đa ${field.max.toLocaleString("vi-VN")} ký tự.` });
    if (field.type === "date") rules.push({ validator: (_, value) => validDateOnly(value) ? Promise.resolve() : Promise.reject(new Error("Ngày không hợp lệ.")) });
    if (field.name === section.end) rules.push(({ getFieldValue }) => ({ validator(_, value) {
      const start = getFieldValue(section.start);
      if (!value || !start || value >= start) return Promise.resolve();
      return Promise.reject(new Error("Ngày kết thúc phải từ ngày bắt đầu trở đi."));
    } }));
    if (field.type === "url") rules.push({ validator: (_, value) => !value?.trim() || getWebsiteUrl(value.trim())
      ? Promise.resolve() : Promise.reject(new Error("Liên kết cần dùng http:// hoặc https://.")) });
    return rules;
  }

  function displayField(record, field) {
    const value = record[field.name];
    if (!value) return "—";
    if (field.type === "date") return formatDateOnly(value);
    if (field.type === "url" && getWebsiteUrl(value)) return <a href={getWebsiteUrl(value)} target="_blank" rel="noopener noreferrer">{value}</a>;
    return <span className="preserve-text">{value}</span>;
  }

  const columns = [
    { title: section.label, key: "title", render: (_, record) => <div className="table-identity"><strong>{record[section.primary]}</strong>
      <span className="table-secondary">{section.secondary.map((field) => record[field]).filter(Boolean).join(" · ")}</span></div> },
    { title: "Thời gian", key: "period", width: 250, render: (_, record) => `${formatDateOnly(record[section.start])} – ${formatDateOnly(record[section.end])}` },
    { title: "Thao tác", key: "actions", width: 170, render: (_, record) => <Space>
      <Button icon={<EditOutlined />} disabled={list.loading || saving} onClick={() => openEditor(record)} aria-label={"Sửa " + section.singular} />
      <Button danger icon={<DeleteOutlined />} disabled={list.loading || saving} aria-label={"Xóa " + section.singular}
        onClick={() => { setError(""); setDeleteTarget(record); }} />
    </Space> },
  ];

  return (
    <>
      <div className="section-toolbar"><h2>{section.label}</h2><Space>
        <Button icon={<ReloadOutlined />} disabled={list.loading || saving} onClick={list.reload} aria-label={"Tải lại " + section.singular} />
        <Button type="primary" icon={<PlusOutlined />} disabled={saving} onClick={() => openEditor()}>Thêm {section.singular}</Button>
      </Space></div>
      {list.error && <Alert className="form-alert" type="error" role="alert" showIcon title={list.error} action={<Button onClick={list.reload}>Thử lại</Button>} />}
      <Table rowKey={(record) => String(record.id)} dataSource={list.rows} columns={columns} loading={list.loading} scroll={{ x: 700 }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={list.error ? "Chưa tải được dữ liệu." : "Chưa có " + section.singular + "."} /> }}
        expandable={{ expandedRowRender: (record) => <Descriptions column={1} size="small" items={section.fields.map((field) => ({ key: field.name, label: field.label, children: displayField(record, field) }))} /> }}
        pagination={{ current: list.query.page, pageSize: list.query.limit, total: list.total, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100] }}
        onChange={(pagination) => list.setQuery((current) => ({ ...current, page: pagination.current, limit: pagination.pageSize }))} />
      <Modal title={(editor?.record ? "Sửa " : "Thêm ") + section.singular} open={Boolean(editor)} onCancel={closeDialogs} onOk={() => form.submit()}
        okText="Lưu" cancelText="Hủy" confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving} keyboard={!saving} mask={{ closable: !saving }} forceRender>
        {error && <Alert className="form-alert" type="error" role="alert" showIcon title={error} />}
        <Form form={form} name={"profile-" + resource} layout="vertical" disabled={saving} requiredMark={false} onFinish={handleSave} onValuesChange={() => setError("")}>
          {section.fields.map((field) => <Form.Item key={field.name} name={field.name} label={field.label} rules={fieldRules(field)}
            dependencies={field.name === section.end ? [section.start] : undefined}>
            {field.type === "textarea" ? <Input.TextArea autoSize={{ minRows: 4, maxRows: 10 }} maxLength={field.max} />
              : <Input type={field.type === "date" ? "date" : "text"} maxLength={field.max} />}
          </Form.Item>)}
        </Form>
      </Modal>
      <Modal title={"Xóa " + section.singular + "?"} open={Boolean(deleteTarget)} onCancel={closeDialogs} onOk={handleDelete}
        okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} confirmLoading={saving} cancelButtonProps={{ disabled: saving }}
        closable={!saving} keyboard={!saving} mask={{ closable: !saving }}>
        <p className="modal-subject">{deleteTarget?.[section.primary]}</p><p>Mục này sẽ được xóa khỏi hồ sơ cá nhân của bạn.</p>
        {error && <Alert type="error" showIcon role="alert" title={error} />}
      </Modal>
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import { Alert, App, Button, Card, Empty, Input, Modal, Select, Table, Tag } from "antd";
import { LockOutlined, ReloadOutlined, UnlockOutlined } from "@ant-design/icons";
import StatusTag from "../../components/StatusTag";
import { roleLabels } from "../../config/navigation";
import { useAuth } from "../../contexts/AuthContext";
import usePaginatedList from "../../hooks/usePaginatedList";
import { listUsers, updateUserStatus } from "../../services/adminService";
import { formatDateTime } from "../../utils/format";

export default function UsersPage() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const list = usePaginatedList(listUsers, { page: 1, limit: 10, q: "", role: "" });
  const [keyword, setKeyword] = useState("");
  const [target, setTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const operation = useRef(null);
  const isLocking = target?.status === "LOCKED";

  useEffect(() => {
    document.title = "Tài khoản | Smart Recruitment";
    return () => operation.current?.abort();
  }, []);

  function openConfirmation(record) {
    if (operation.current || String(record.id) === String(user.id)) return;
    setActionError("");
    setTarget({ record, status: record.status === "ACTIVE" ? "LOCKED" : "ACTIVE" });
  }

  function closeConfirmation() {
    if (operation.current) return;
    setTarget(null);
    setActionError("");
  }

  async function handleStatusChange() {
    if (operation.current || !target) return;
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    setActionError("");
    try {
      await updateUserStatus(target.record.id, target.status, controller.signal);
      if (controller.signal.aborted) return;
      message.success(target.status === "LOCKED" ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
      setTarget(null);
      list.reload();
    } catch (error) {
      if (!controller.signal.aborted) setActionError(error.message);
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  const columns = [
    {
      title: "Email",
      dataIndex: "email",
      width: 280,
      render: (email, record) => <div className="table-identity"><span>{email}</span>
        {String(record.id) === String(user.id) && <Tag>Bạn</Tag>}</div>,
    },
    { title: "Tên đăng nhập", dataIndex: "username", width: 180, render: (value) => value || "—" },
    { title: "Vai trò", dataIndex: "role", width: 170, render: (role) => roleLabels[role] || role },
    { title: "Trạng thái", dataIndex: "status", width: 150, render: (status) => <StatusTag status={status} /> },
    { title: "Ngày tạo", dataIndex: "created_at", width: 190, render: formatDateTime },
    {
      title: "Thao tác",
      key: "actions",
      width: 155,
      render: (_, record) => (
        <Button
          danger={record.status === "ACTIVE"}
          icon={record.status === "ACTIVE" ? <LockOutlined /> : <UnlockOutlined />}
          disabled={list.loading || saving || String(record.id) === String(user.id)}
          onClick={() => openConfirmation(record)}
        >{record.status === "ACTIVE" ? "Khóa" : "Mở khóa"}</Button>
      ),
    },
  ];

  return (
    <section>
      <div className="page-heading page-heading-with-actions">
        <div><h1>Tài khoản</h1><p>Tra cứu tài khoản và quản lý quyền truy cập hệ thống.</p></div>
        <Button icon={<ReloadOutlined />} onClick={list.reload} disabled={list.loading || saving}>Tải lại</Button>
      </div>
      {list.error && <Alert className="form-alert" type="error" showIcon role="alert" title={list.error}
        action={<Button onClick={list.reload}>Thử lại</Button>} />}
      <Card className="data-table-card">
        <div className="table-toolbar">
          <div className="filter-field filter-search">
            <label htmlFor="user-email-search">Tìm theo email</label>
            <Input.Search id="user-email-search" placeholder="Nhập email cần tìm" maxLength={120} allowClear enterButton="Tìm kiếm"
              value={keyword} disabled={saving}
              onChange={(event) => {
                setKeyword(event.target.value);
                if (!event.target.value) list.setQuery((current) => ({ ...current, q: "", page: 1 }));
              }}
              onSearch={(value) => list.setQuery((current) => ({ ...current, q: value.trim(), page: 1 }))} />
          </div>
          <div className="filter-field">
            <label htmlFor="user-role-filter">Vai trò</label>
            <Select id="user-role-filter" value={list.query.role} disabled={saving}
              options={[
                { value: "", label: "Tất cả vai trò" },
                { value: "CANDIDATE", label: "Ứng viên" },
                { value: "COMPANY", label: "Nhà tuyển dụng" },
                { value: "ADMIN", label: "Quản trị viên" },
              ]}
              onChange={(role) => list.setQuery((current) => ({ ...current, role, page: 1 }))} />
          </div>
        </div>
        <Table
          rowKey={(record) => String(record.id)}
          columns={columns}
          dataSource={list.rows}
          loading={list.loading}
          scroll={{ x: 1125 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={list.error ? "Chưa tải được danh sách tài khoản." : "Không có tài khoản phù hợp."} /> }}
          pagination={{
            current: list.query.page,
            pageSize: list.query.limit,
            total: list.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} tài khoản`,
          }}
          onChange={(pagination) => list.setQuery((current) => ({ ...current, page: pagination.current, limit: pagination.pageSize }))}
        />
      </Card>
      <Modal
        title={isLocking ? "Khóa tài khoản?" : "Mở khóa tài khoản?"}
        open={Boolean(target)}
        onCancel={closeConfirmation}
        onOk={handleStatusChange}
        okText={isLocking ? "Khóa tài khoản" : "Mở khóa tài khoản"}
        cancelText="Hủy"
        confirmLoading={saving}
        okButtonProps={{ danger: isLocking }}
        cancelButtonProps={{ disabled: saving }}
        closable={!saving}
        mask={{ closable: !saving }}
        keyboard={!saving}
      >
        <p className="modal-subject">{target?.record.email}</p>
        <p>{isLocking ? "Tài khoản sẽ bị từ chối truy cập khi hệ thống xác thực yêu cầu tiếp theo." : "Tài khoản sẽ có thể đăng nhập và sử dụng lại hệ thống."}</p>
        {actionError && <Alert type="error" showIcon role="alert" title={actionError} />}
      </Modal>
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, App, Button, Card, Empty, Pagination, Select, Skeleton, Space, Tag } from "antd";
import { CheckOutlined, ReloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import usePaginatedList from "../hooks/usePaginatedList";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../services/notificationService";
import { formatDateTime } from "../utils/format";
import { notificationDestination } from "../utils/notifications";

export default function NotificationsPage() {
  const { user } = useAuth();
  return <NotificationsInbox key={`${user.id}:${user.role}`} role={user.role} />;
}

function NotificationsInbox({ role }) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { unreadCount, acceptCount, refresh } = useNotifications();
  const load = useCallback(async (query, signal) => {
    const result = await listNotifications(role, query, signal);
    if (!signal.aborted) acceptCount(result.unreadCount);
    return result;
  }, [role, acceptCount]);
  const list = usePaginatedList(load, { page: 1, limit: 10, unread: "" });
  const [saving, setSaving] = useState(false);
  const [targetId, setTargetId] = useState(null);
  const [error, setError] = useState("");
  const operation = useRef(null);
  const locked = saving || list.loading;
  useEffect(() => { document.title = "Thông báo | Smart Recruitment"; return () => operation.current?.abort(); }, []);

  async function markRead(notification, destination) {
    if (operation.current || list.loading) return;
    if (notification?.read_at) { if (destination) navigate(destination); return; }
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    setTargetId(notification?.id || "all");
    setError("");
    try {
      if (notification) await markNotificationRead(role, notification.id, controller.signal);
      else await markAllNotificationsRead(role, controller.signal);
      if (controller.signal.aborted) return;
      list.reload();
      refresh();
      if (destination) navigate(destination);
      else message.success(notification ? "Đã đánh dấu thông báo đã đọc." : "Đã đánh dấu tất cả thông báo đã đọc.");
    } catch (requestError) {
      if (!controller.signal.aborted) { setError(requestError.message); list.reload(); refresh(); }
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) { setSaving(false); setTargetId(null); }
    }
  }

  return <section>
    <div className="page-heading page-heading-with-actions"><div><h1>Thông báo</h1><p>{unreadCount == null ? "Theo dõi cập nhật liên quan đến hồ sơ và tuyển dụng." : `${unreadCount} thông báo chưa đọc.`}</p></div>
      <Space wrap><Button icon={<ReloadOutlined />} disabled={locked} onClick={() => { setError(""); list.reload(); refresh(); }}>Tải lại</Button>
        <Button icon={<CheckOutlined />} disabled={locked || !unreadCount} loading={saving && targetId === "all"} onClick={() => markRead()}>Đánh dấu tất cả đã đọc</Button></Space></div>
    <Card>
      <div className="notification-toolbar"><label htmlFor="notification-filter">Hiển thị</label><Select id="notification-filter" value={list.query.unread} disabled={locked}
        options={[{ value: "", label: "Tất cả thông báo" }, { value: "true", label: "Chưa đọc" }]}
        onChange={(unread) => list.setQuery((current) => ({ ...current, unread, page: 1 }))} /></div>
      {error && <Alert className="form-alert" type="error" showIcon role="alert" title={error} />}
      {list.error && <Alert className="form-alert" type="error" showIcon role="alert" title={list.error} action={<Button disabled={saving} onClick={list.reload}>Thử lại</Button>} />}
      {list.loading ? <Skeleton active paragraph={{ rows: 6 }} /> : !list.rows.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={list.error ? "Chưa tải được thông báo." : list.query.unread ? "Bạn đã đọc hết thông báo." : "Chưa có thông báo."} />
        : <div className="notification-list">{list.rows.map((notification) => {
          const destination = notificationDestination(notification.target_path, role);
          return <article key={notification.id} className={"notification-item" + (notification.read_at ? "" : " notification-unread")}>
            <div className="notification-title"><h2>{notification.title}</h2>{!notification.read_at && <Tag color="blue">Chưa đọc</Tag>}</div>
            <p className="preserve-text job-body-text">{notification.body}</p>
            <p className="muted-text notification-date">{formatDateTime(notification.created_at)}</p>
            <Space wrap>{destination && <Button type="link" disabled={locked} loading={saving && targetId === notification.id}
              onClick={() => markRead(notification, destination)}>Mở nội dung</Button>}
              {!notification.read_at && <Button disabled={locked} loading={saving && targetId === notification.id} onClick={() => markRead(notification)}>Đánh dấu đã đọc</Button>}</Space>
          </article>;
        })}</div>}
      {list.total > 0 && <div className="list-pagination"><Pagination current={list.query.page} pageSize={list.query.limit} total={list.total} disabled={locked}
        showSizeChanger pageSizeOptions={[10, 20, 50, 100]} showTotal={(total) => `${total} thông báo`}
        onChange={(page, limit) => list.setQuery((current) => ({ ...current, page, limit }))} /></div>}
    </Card>
  </section>;
}

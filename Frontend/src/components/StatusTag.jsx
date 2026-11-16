import { Tag } from "antd";

const labels = {
  PENDING: { text: "Chờ xác minh", color: "warning" },
  VERIFIED: { text: "Đã xác minh", color: "success" },
  REJECTED: { text: "Bị từ chối", color: "error" },
  ACTIVE: { text: "Hoạt động", color: "success" },
  LOCKED: { text: "Đã khóa", color: "error" },
  DRAFT: { text: "Bản nháp", color: "default" },
  NEEDS_CHANGES: { text: "Cần bổ sung", color: "warning" },
  PUBLISHED: { text: "Đang đăng", color: "success" },
  CLOSED: { text: "Đã đóng", color: "default" },
  EXPIRED: { text: "Hết hạn", color: "default" },
  SUBMITTED: { text: "Đã nộp", color: "blue" },
  REVIEWING: { text: "Đang xem xét", color: "processing" },
  INTERVIEW: { text: "Phỏng vấn", color: "purple" },
  OFFERED: { text: "Đề nghị làm việc", color: "cyan" },
  HIRED: { text: "Đã tuyển", color: "success" },
  WITHDRAWN: { text: "Đã rút", color: "default" },
  SCHEDULED: { text: "Đã lên lịch", color: "blue" },
  COMPLETED: { text: "Hoàn tất", color: "success" },
  CANCELLED: { text: "Đã hủy", color: "default" },
  UPLOADED: { text: "Đã tải lên", color: "blue" },
  QUEUED: { text: "Chờ xử lý", color: "default" },
  PROCESSING: { text: "Đang xử lý", color: "processing" },
  READY: { text: "Đã trích xuất", color: "success" },
  FAILED: { text: "Xử lý thất bại", color: "error" },
};

export default function StatusTag({ status }) {
  const value = labels[status] || { text: status || "Chưa xác định" };
  return <Tag color={value.color}>{value.text}</Tag>;
}

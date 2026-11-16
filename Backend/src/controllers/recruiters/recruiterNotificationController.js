const { Notification } = require("../../models");
const AppError = require("../../utils/AppError");

function parsePositiveInteger(value, name) {
  if ((typeof value !== "string" && typeof value !== "number") || !/^[1-9]\d*$/.test(String(value))) {
    throw new AppError(400, "INVALID_NUMBER", name + " phải là số nguyên dương.");
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    throw new AppError(400, "INVALID_NUMBER", name + " vượt quá giới hạn cho phép.");
  }
  return number;
}

function parsePagination(query) {
  const page = parsePositiveInteger(query.page ?? 1, "page");
  const limit = parsePositiveInteger(query.limit ?? 20, "limit");
  const offset = (page - 1) * limit;
  if (limit > 100 || !Number.isSafeInteger(offset)) {
    throw new AppError(400, "INVALID_PAGINATION", "limit tối đa 100 và page phải hợp lệ.");
  }
  return { page, limit, offset };
}

function paginatedResponse(data, total, page, limit) {
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

exports.listNotifications = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    if (req.query.unread !== undefined && !["true", "false"].includes(req.query.unread)) {
      throw new AppError(400, "INVALID_UNREAD_FILTER", "unread phải là true hoặc false.");
    }
    const { rows, count } = await Notification.findAndCountAll({
      where: { user_id: req.user.id, ...(req.query.unread === "true" ? { read_at: null } : {}) },
      order: [["created_at", "DESC"], ["id", "DESC"]],
      limit,
      offset,
    });
    const unreadCount = await Notification.count({
      where: { user_id: req.user.id, read_at: null },
    });
    return res.json({
      ...paginatedResponse(rows, count, page, limit),
      unreadCount,
    });
  } catch (error) {
    return next(error);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.notificationId, "notificationId");
    const notification = await Notification.findOne({
      where: { id, user_id: req.user.id },
      attributes: ["id", "read_at"],
    });
    if (!notification) {
      throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Không tìm thấy thông báo.");
    }
    if (!notification.read_at) {
      await notification.update({ read_at: new Date() });
    }
    return res.json({ message: "Thông báo đã được đánh dấu đã đọc." });
  } catch (error) {
    return next(error);
  }
};

exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    const [updatedCount] = await Notification.update(
      { read_at: new Date() },
      { where: { user_id: req.user.id, read_at: null } },
    );
    return res.json({ message: "Đã đánh dấu tất cả thông báo là đã đọc.", updatedCount });
  } catch (error) {
    return next(error);
  }
};

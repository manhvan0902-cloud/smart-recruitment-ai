const { Ai_task } = require("../../models");
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

exports.getAiTask = async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.taskId, "taskId");
    const task = await Ai_task.findOne({
      where: { id, requested_by: req.user.id },
      attributes: [
        "id",
        "feature",
        "status",
        "output_json",
        "model_name",
        "prompt_version",
        "algorithm_version",
        "attempt_count",
        "error_code",
        "error_message",
        "created_at",
        "started_at",
        "finished_at",
      ],
    });
    if (!task)
      throw new AppError(404, "AI_TASK_NOT_FOUND", "Không tìm thấy tác vụ.");
    return res.json({ data: task });
  } catch (error) {
    return next(error);
  }
};

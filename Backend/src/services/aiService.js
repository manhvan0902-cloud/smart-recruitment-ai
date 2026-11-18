const crypto = require("node:crypto");
const { Op } = require("sequelize");
const { sequelize, User, Ai_task } = require("../models");
const AppError = require("../utils/AppError");

function configuration() {
  const provider = (process.env.AI_PROVIDER || "groq").trim().toLowerCase();
  if (!["groq", "openai"].includes(provider)) {
    throw new AppError(503, "AI_INVALID_CONFIGURATION", "Nhà cung cấp AI chưa được hỗ trợ.");
  }
  const prefix = provider === "groq" ? "GROQ" : "OPENAI";
  const label = provider === "groq" ? "Groq" : "OpenAI";
  const apiKey = process.env[prefix + "_API_KEY"]?.trim();
  if (!apiKey) throw new AppError(503, "AI_NOT_CONFIGURED", "Dịch vụ AI chưa được cấu hình. Vui lòng liên hệ quản trị hệ thống.");
  const model = process.env[prefix + "_MODEL"]?.trim() || (provider === "groq" ? "openai/gpt-oss-120b" : "gpt-6-luna");
  const timeout = Number(process.env[prefix + "_TIMEOUT_MS"] || 90000);
  const maxOutputTokens = Number(process.env[prefix + "_MAX_OUTPUT_TOKENS"] || (provider === "groq" ? 4096 : 10000));
  if (!model || model.length > 120 || !Number.isInteger(timeout) || timeout < 1000 || timeout > 180000 ||
      !Number.isInteger(maxOutputTokens) || maxOutputTokens < 1000 || maxOutputTokens > 20000) {
    throw new AppError(503, "AI_INVALID_CONFIGURATION", "Cấu hình model, thời gian chờ hoặc giới hạn đầu ra AI không hợp lệ.");
  }
  return { provider, label, apiKey, model, timeout, maxOutputTokens };
}

// Validate again on our server, including limits that prompts cannot guarantee.
function validateSchema(value, schema) {
  let valid = true;
  switch (schema.type) {
    case "object":
      valid = value !== null && typeof value === "object" && !Array.isArray(value);
      if (valid) {
        valid = Object.keys(value).every((key) => Object.hasOwn(schema.properties, key)) &&
          schema.required.every((key) => Object.hasOwn(value, key));
        if (valid) {
          for (const [key, child] of Object.entries(schema.properties)) validateSchema(value[key], child);
        }
      }
      break;
    case "array":
      valid = Array.isArray(value) && value.length >= (schema.minItems || 0) && value.length <= schema.maxItems;
      if (valid) {
        for (const item of value) validateSchema(item, schema.items);
      }
      break;
    case "string":
      valid = typeof value === "string" && value.length >= (schema.minLength || 0) && value.length <= schema.maxLength;
      break;
    case "boolean": valid = typeof value === "boolean"; break;
    default: valid = false;
  }
  if (!valid) throw new AppError(502, "AI_INVALID_OUTPUT", "AI trả về dữ liệu không đúng định dạng. Hãy kiểm tra lịch sử trước khi thử lại.");
}

async function requestOutput(config, instructions, input, schema, name) {
  const isGroq = config.provider === "groq";
  const url = isGroq ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.openai.com/v1/responses";
  const requestBody = isGroq ? {
    model: config.model,
    messages: [{ role: "system", content: instructions }, { role: "user", content: JSON.stringify(input) }],
    max_completion_tokens: config.maxOutputTokens,
    response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
  } : {
    model: config.model,
    store: false,
    instructions,
    input: [{ role: "user", content: JSON.stringify(input) }],
    max_output_tokens: config.maxOutputTokens,
    text: { format: { type: "json_schema", name, strict: true, schema } },
  };
  if (isGroq && config.model.startsWith("openai/gpt-oss-")) {
    requestBody.reasoning_effort = "low";
    requestBody.include_reasoning = false;
  }
  let response;
  let body;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { Authorization: "Bearer " + config.apiKey, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(config.timeout),
      body: JSON.stringify(requestBody),
    });
    body = await response.json();
  } catch (error) {
    if (error.name === "TimeoutError") throw new AppError(504, "AI_TIMEOUT", config.label + " phản hồi quá thời gian chờ. Hãy kiểm tra lịch sử xử lý trước khi thử lại.");
    throw new AppError(503, "AI_UNAVAILABLE", "Chưa kết nối được dịch vụ " + config.label + ". Vui lòng thử lại sau.");
  }
  if (!response.ok) {
    if ([401, 403].includes(response.status)) throw new AppError(503, "AI_AUTH_ERROR", config.label + " từ chối xác thực. Quản trị viên cần kiểm tra API key và quyền sử dụng model.");
    if (response.status === 429) {
      const error = new AppError(429, "AI_RATE_LIMIT", config.label + " đã đạt hạn mức yêu cầu hoặc token. Hãy chờ theo hạn mức tài khoản trước khi gửi lại.");
      const retryAfter = response.headers.get("retry-after");
      const seconds = Number(retryAfter);
      if (retryAfter && Number.isFinite(seconds) && seconds >= 0 && seconds <= 86400) {
        error.retryAfterSeconds = Math.ceil(seconds);
      }
      throw error;
    }
    if (response.status === 413) throw new AppError(413, "AI_TOKEN_LIMIT", "Nội dung vượt giới hạn token của " + config.label + ". Hãy dùng CV ngắn hơn hoặc giảm giới hạn đầu ra trong cấu hình máy chủ.");
    throw new AppError(502, "AI_PROVIDER_ERROR", config.label + " chưa xử lý được yêu cầu. Kiểm tra cấu hình model hoặc thử lại sau.");
  }
  let text;
  if (isGroq) {
    const choice = body?.choices?.[0];
    if (choice?.message?.refusal || choice?.finish_reason === "content_filter") throw new AppError(422, "AI_REFUSED", "AI không thể xử lý nội dung này. Hãy điều chỉnh nội dung đầu vào.");
    if (choice?.finish_reason === "length") throw new AppError(502, "AI_INCOMPLETE", "AI đã đạt giới hạn đầu ra trước khi tạo xong kết quả. Hãy dùng nội dung ngắn hơn hoặc điều chỉnh cấu hình.");
    if (choice?.finish_reason !== "stop" || typeof choice.message?.content !== "string") throw new AppError(502, "AI_INVALID_OUTPUT", "Groq trả về kết quả không hợp lệ.");
    text = choice.message.content;
  } else {
    if (!Array.isArray(body?.output)) throw new AppError(502, "AI_INVALID_OUTPUT", "OpenAI trả về kết quả không hợp lệ.");
    const contents = body.output.flatMap((item) => item.content || []);
    if (contents.some((item) => item.type === "refusal")) throw new AppError(422, "AI_REFUSED", "AI không thể xử lý nội dung này. Hãy điều chỉnh nội dung đầu vào.");
    if (body.status !== "completed") throw new AppError(502, "AI_INCOMPLETE", "AI chưa tạo xong kết quả trong giới hạn đầu ra. Quản trị viên có thể điều chỉnh cấu hình.");
    text = contents.filter((item) => item.type === "output_text").map((item) => item.text).join("");
  }
  let output;
  try { output = JSON.parse(text); } catch { throw new AppError(502, "AI_INVALID_OUTPUT", "AI trả về dữ liệu không đọc được."); }
  validateSchema(output, schema);
  return { output, model: body.model || config.model, responseId: body.id, usage: body.usage || null };
}

async function executeAiTask({ userId, feature, references = {}, input, schema, instructions, validate, persist }) {
  const config = configuration();
  const serialized = JSON.stringify(input);
  if (serialized.length > 180000) throw new AppError(413, "AI_INPUT_TOO_LONG", "Nội dung quá dài cho một lần phân tích AI. Hãy dùng CV hoặc nội dung công việc ngắn hơn.");
  const inputHash = crypto.createHash("sha256").update(config.provider + config.model + feature + serialized).digest("hex");
  // Serialize task creation per account without holding a database lock during HTTP calls.
  const task = await sequelize.transaction(async (transaction) => {
    const account = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!account || account.status !== "ACTIVE") throw new AppError(403, "ACCOUNT_UNAVAILABLE", "Tài khoản không còn hoạt động.");
    const expired = new Date(Date.now() - 210000);
    await Ai_task.update({ status: "FAILED", error_code: "AI_INTERRUPTED", error_message: "Tác vụ bị gián đoạn hoặc quá thời gian xử lý.", finished_at: new Date() },
      { where: { requested_by: userId, status: "RUNNING", [Op.or]: [
        { started_at: { [Op.lt]: expired } },
        { started_at: null, created_at: { [Op.lt]: expired } },
      ] }, transaction });
    const running = await Ai_task.count({ where: { requested_by: userId, status: "RUNNING" }, transaction });
    if (running) throw new AppError(409, "AI_BUSY", "Tài khoản đang có một tác vụ AI được xử lý. Hãy chờ hoặc tải lại lịch sử.");
    const algorithms = { PARSE_CV: "profile-v1", MATCH_CV: "skills-v1", GENERATE_JD: "jd-v1", INTERVIEW_QUESTIONS: "questions-v1" };
    return Ai_task.create({ requested_by: userId, feature, ...references, status: "RUNNING", input_hash: inputHash,
      input_snapshot: input, model_name: config.model, prompt_version: "recruitment-v1", algorithm_version: config.provider + "-" + algorithms[feature],
      attempt_count: 1, started_at: new Date() }, { transaction });
  });
  try {
    const result = await requestOutput(config, instructions, input, schema, feature.toLowerCase());
    if (validate) validate(result.output);
    return await sequelize.transaction(async (transaction) => {
      // A timed-out task cannot later overwrite the state of a newer request.
      const current = await Ai_task.findOne({ where: { id: task.id, status: "RUNNING" }, transaction, lock: transaction.LOCK.UPDATE });
      if (!current) throw new AppError(409, "AI_TASK_EXPIRED", "Tác vụ đã hết hiệu lực. Hãy tải lại lịch sử.");
      const data = persist ? await persist(result.output, current, transaction) : result.output;
      const meta = { provider: config.provider, providerLabel: config.label, model: result.model, responseId: result.responseId, usage: result.usage,
        sourceVersion: input.sourceVersion ?? null, generatedAt: new Date().toISOString() };
      await current.update({ status: "SUCCEEDED", model_name: result.model, output_json: { ...result.output, meta }, finished_at: new Date() }, { transaction });
      return { data, taskId: current.id, meta };
    });
  } catch (error) {
    const publicError = error instanceof AppError ? error : new AppError(500, "AI_SAVE_FAILED", "Chưa lưu được kết quả AI. Hãy tải lại lịch sử trước khi thử lại.");
    try {
      await Ai_task.update({ status: "FAILED", error_code: publicError.code, error_message: publicError.message, finished_at: new Date() },
        { where: { id: task.id, status: "RUNNING" } });
    } catch (saveError) {
      console.error("Không cập nhật được trạng thái tác vụ AI:", saveError.name);
    }
    throw publicError;
  }
}

module.exports = { executeAiTask };

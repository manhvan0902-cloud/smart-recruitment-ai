"use strict";

const { DataTypes, modelOptions, sequelize, timestamp } = require("../base");

const Ai_task = sequelize.define(
  "Ai_task",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    requested_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    feature: {
      type: DataTypes.ENUM("PARSE_CV", "MATCH_CV", "GENERATE_JD", "INTERVIEW_QUESTIONS"),
      allowNull: false,
    },
    cv_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    job_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    application_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    status: {
      type: DataTypes.ENUM("QUEUED", "RUNNING", "SUCCEEDED", "FAILED"),
      allowNull: false,
      defaultValue: "QUEUED",
    },
    input_hash: { type: DataTypes.CHAR(64), allowNull: false },
    input_snapshot: {
      type: DataTypes.JSON,
      allowNull: false,
      // MariaDB có thể trả JSON dưới dạng chuỗi qua mysql2.
      get() {
        const value = this.getDataValue("input_snapshot");
        return typeof value === "string" ? JSON.parse(value) : value;
      },
    },
    output_json: {
      type: DataTypes.JSON,
      allowNull: true,
      // MariaDB có thể trả JSON dưới dạng chuỗi qua mysql2.
      get() {
        const value = this.getDataValue("output_json");
        return typeof value === "string" ? JSON.parse(value) : value;
      },
    },
    model_name: { type: DataTypes.STRING(120), allowNull: true },
    prompt_version: { type: DataTypes.STRING(40), allowNull: false },
    algorithm_version: { type: DataTypes.STRING(40), allowNull: false },
    attempt_count: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    error_code: { type: DataTypes.STRING(100), allowNull: true },
    error_message: { type: DataTypes.STRING(1000), allowNull: true },
    created_at: timestamp,
    started_at: { type: DataTypes.DATE(3), allowNull: true },
    finished_at: { type: DataTypes.DATE(3), allowNull: true },
  },
  modelOptions("ai_tasks", {
    indexes: [
      { name: "ix_ai_queue", fields: ["status", "created_at"] },
      { name: "ix_ai_requester", fields: ["requested_by", "feature", "input_hash"] },
    ],
  }),
);

module.exports = { Ai_task };
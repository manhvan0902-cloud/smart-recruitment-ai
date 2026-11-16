"use strict";

const { DataTypes, modelOptions, sequelize, timestamp } = require("../base");

const Match_result = sequelize.define(
  "Match_result",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    task_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
    job_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    cv_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    application_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    job_revision: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    cv_extraction_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    input_hash: { type: DataTypes.CHAR(64), allowNull: false },
    algorithm_version: { type: DataTypes.STRING(40), allowNull: false },
    evidence_status: {
      type: DataTypes.ENUM("SUFFICIENT", "INSUFFICIENT"),
      allowNull: false,
    },
    skill_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    experience_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    total_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    matched_skills: {
      type: DataTypes.JSON,
      allowNull: false,
      // MariaDB có thể trả JSON dưới dạng chuỗi qua mysql2.
      get() {
        const value = this.getDataValue("matched_skills");
        return typeof value === "string" ? JSON.parse(value) : value;
      },
    },
    missing_skills: {
      type: DataTypes.JSON,
      allowNull: false,
      // MariaDB có thể trả JSON dưới dạng chuỗi qua mysql2.
      get() {
        const value = this.getDataValue("missing_skills");
        return typeof value === "string" ? JSON.parse(value) : value;
      },
    },
    evidence: {
      type: DataTypes.JSON,
      allowNull: false,
      // MariaDB có thể trả JSON dưới dạng chuỗi qua mysql2.
      get() {
        const value = this.getDataValue("evidence");
        return typeof value === "string" ? JSON.parse(value) : value;
      },
    },
    explanation: { type: DataTypes.TEXT, allowNull: false },
    suggestions: {
      type: DataTypes.JSON,
      allowNull: false,
      // MariaDB có thể trả JSON dưới dạng chuỗi qua mysql2.
      get() {
        const value = this.getDataValue("suggestions");
        return typeof value === "string" ? JSON.parse(value) : value;
      },
    },
    created_at: timestamp,
  },
  modelOptions("match_results", {
    indexes: [
      { name: "ix_match_cv_job", fields: ["cv_id", "job_id", "job_revision"] },
      { name: "ix_match_application_latest", fields: ["application_id", "created_at", "id"] },
    ],
  }),
);

module.exports = { Match_result };
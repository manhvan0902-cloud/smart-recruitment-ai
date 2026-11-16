"use strict";

const { DataTypes, modelOptions, sequelize, timestamp, updatedTimestamp } = require("../base");

const Application = sequelize.define(
  "Application",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    job_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    candidate_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    cv_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    cover_letter: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM(
        "SUBMITTED",
        "REVIEWING",
        "INTERVIEW",
        "OFFERED",
        "HIRED",
        "REJECTED",
        "WITHDRAWN",
      ),
      allowNull: false,
      defaultValue: "SUBMITTED",
    },
    recruiter_note: { type: DataTypes.TEXT, allowNull: true },
    job_revision: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    job_snapshot: {
      type: DataTypes.JSON,
      allowNull: false,
      // MariaDB có thể trả JSON dưới dạng chuỗi qua mysql2.
      get() {
        const value = this.getDataValue("job_snapshot");
        return typeof value === "string" ? JSON.parse(value) : value;
      },
    },
    cv_snapshot: {
      type: DataTypes.JSON,
      allowNull: false,
      // MariaDB có thể trả JSON dưới dạng chuỗi qua mysql2.
      get() {
        const value = this.getDataValue("cv_snapshot");
        return typeof value === "string" ? JSON.parse(value) : value;
      },
    },
    profile_snapshot: {
      type: DataTypes.JSON,
      allowNull: false,
      // MariaDB có thể trả JSON dưới dạng chuỗi qua mysql2.
      get() {
        const value = this.getDataValue("profile_snapshot");
        return typeof value === "string" ? JSON.parse(value) : value;
      },
    },
    submitted_at: timestamp,
    updated_at: updatedTimestamp,
  },
  modelOptions("applications", {
    indexes: [
      { name: "uq_application_once", unique: true, fields: ["job_id", "candidate_id"] },
      { name: "uq_application_context", unique: true, fields: ["id", "job_id", "cv_id"] },
      { name: "ix_app_candidate", fields: ["candidate_id", "submitted_at"] },
      {
        name: "ix_app_pipeline_created",
        fields: ["job_id", "status", "submitted_at", "id"],
      },
    ],
  }),
);

module.exports = { Application };
"use strict";

const { DataTypes, modelOptions, sequelize, timestamp, updatedTimestamp } = require("../base");

const Interview = sequelize.define(
  "Interview",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    application_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    starts_at: { type: DataTypes.DATE(3), allowNull: false },
    ends_at: { type: DataTypes.DATE(3), allowNull: false },
    timezone_name: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: "Asia/Ho_Chi_Minh",
    },
    mode: { type: DataTypes.ENUM("ONLINE", "OFFLINE"), allowNull: false },
    meeting_url: { type: DataTypes.STRING(1000), allowNull: true },
    location_text: { type: DataTypes.STRING(500), allowNull: true },
    invitation_note: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM("SCHEDULED", "COMPLETED", "CANCELLED"),
      allowNull: false,
      defaultValue: "SCHEDULED",
    },
    candidate_response: {
      type: DataTypes.ENUM("PENDING", "ACCEPTED", "DECLINED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    responded_at: { type: DataTypes.DATE(3), allowNull: true },
    created_at: timestamp,
    updated_at: updatedTimestamp,
  },
  modelOptions("interviews", {
    indexes: [
      { name: "ix_interview_application", fields: ["application_id", "starts_at"] },
      { name: "ix_interview_calendar", fields: ["status", "starts_at"] },
    ],
  }),
);

module.exports = { Interview };
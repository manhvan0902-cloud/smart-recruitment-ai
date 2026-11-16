"use strict";

const { DataTypes, modelOptions, sequelize, timestamp } = require("../base");

const Notification = sequelize.define(
  "Notification",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    type: { type: DataTypes.STRING(60), allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    target_path: { type: DataTypes.STRING(500), allowNull: true },
    read_at: { type: DataTypes.DATE(3), allowNull: true },
    created_at: timestamp,
  },
  modelOptions("notifications", {
    indexes: [
      { name: "ix_notifications_inbox", fields: ["user_id", "read_at", "created_at"] },
      { name: "ix_notifications_user_created", fields: ["user_id", "created_at", "id"] },
    ],
  }),
);

module.exports = { Notification };
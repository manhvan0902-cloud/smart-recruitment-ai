"use strict";

const { DataTypes, modelOptions, sequelize, timestamp } = require("../base");

const Cv_document = sequelize.define(
  "Cv_document",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    candidate_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    file_asset_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    processing_status: {
      type: DataTypes.ENUM("UPLOADED", "QUEUED", "PROCESSING", "READY", "FAILED"),
      allowNull: false,
      defaultValue: "UPLOADED",
    },
    raw_text: { type: DataTypes.TEXT("medium"), allowNull: true },
    parsed_data: {
      type: DataTypes.JSON,
      allowNull: true,
      // MariaDB có thể trả JSON dưới dạng chuỗi qua mysql2.
      get() {
        const value = this.getDataValue("parsed_data");
        return typeof value === "string" ? JSON.parse(value) : value;
      },
    },
    extraction_version: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    error_message: { type: DataTypes.STRING(1000), allowNull: true },
    parsed_at: { type: DataTypes.DATE(3), allowNull: true },
    archived_at: { type: DataTypes.DATE(3), allowNull: true },
    created_at: timestamp,
  },
  modelOptions("cv_documents", {
    indexes: [
      { name: "uq_cv_owner", unique: true, fields: ["id", "candidate_id"] },
      {
        name: "ix_cv_candidate_created",
        fields: ["candidate_id", "archived_at", "created_at", "id"],
      },
    ],
  }),
);

module.exports = { Cv_document };
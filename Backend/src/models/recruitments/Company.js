"use strict";

const { DataTypes, modelOptions, sequelize, timestamp, updatedTimestamp } = require("../base");

const Company = sequelize.define(
  "Company",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    industry_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    location_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    address: { type: DataTypes.STRING(300), allowNull: true },
    website: { type: DataTypes.STRING(500), allowNull: true },
    contact_email: { type: DataTypes.STRING(254), allowNull: true },
    company_size: { type: DataTypes.STRING(50), allowNull: true },
    logo_asset_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    verification_status: {
      type: DataTypes.ENUM("PENDING", "VERIFIED", "REJECTED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    verification_note: { type: DataTypes.STRING(1000), allowNull: true },
    verified_at: { type: DataTypes.DATE(3), allowNull: true },
    created_at: timestamp,
    updated_at: updatedTimestamp,
  },
  modelOptions("companies", {
    indexes: [
      {
        name: "ix_company_verification_created",
        fields: ["verification_status", "created_at", "id"],
      },
    ],
  }),
);

module.exports = { Company };
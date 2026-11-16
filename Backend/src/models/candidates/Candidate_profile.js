"use strict";

const { DataTypes, modelOptions, sequelize, updatedTimestamp } = require("../base");

const Candidate_profile = sequelize.define(
  "Candidate_profile",
  {
    user_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true },
    full_name: { type: DataTypes.STRING(150), allowNull: false },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    headline: { type: DataTypes.STRING(200), allowNull: true },
    summary: { type: DataTypes.TEXT, allowNull: true },
    avatar_asset_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    location_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    desired_location_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    desired_industry_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    desired_employment_type_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    desired_work_mode: {
      type: DataTypes.ENUM("ONSITE", "HYBRID", "REMOTE"),
      allowNull: true,
    },
    desired_salary_min: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    profile_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    updated_at: updatedTimestamp,
  },
  modelOptions("candidate_profiles"),
);

module.exports = { Candidate_profile };
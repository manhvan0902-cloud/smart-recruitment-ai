"use strict";

const { DataTypes, modelOptions, sequelize, timestamp, updatedTimestamp } = require("../base");

const Job_post = sequelize.define(
  "Job_post",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    requirements: { type: DataTypes.TEXT, allowNull: true },
    benefits: { type: DataTypes.TEXT, allowNull: true },
    industry_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    location_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    level_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    employment_type_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    work_mode: {
      type: DataTypes.ENUM("ONSITE", "HYBRID", "REMOTE"),
      allowNull: false,
      defaultValue: "ONSITE",
    },
    address: { type: DataTypes.STRING(300), allowNull: true },
    salary_negotiable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    salary_min: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    salary_max: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    currency: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: "VND" },
    salary_period: {
      type: DataTypes.ENUM("MONTH"),
      allowNull: false,
      defaultValue: "MONTH",
    },
    min_experience_months: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    education_requirement: { type: DataTypes.STRING(200), allowNull: true },
    vacancies: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    application_deadline: { type: DataTypes.DATE(3), allowNull: true },
    status: {
      type: DataTypes.ENUM("DRAFT", "NEEDS_CHANGES", "PUBLISHED", "CLOSED", "EXPIRED"),
      allowNull: false,
      defaultValue: "DRAFT",
    },
    is_hidden: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    hidden_reason: { type: DataTypes.STRING(1000), allowNull: true },
    revision: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    validation_errors: {
      type: DataTypes.JSON,
      allowNull: true,
      // MariaDB có thể trả JSON dưới dạng chuỗi qua mysql2.
      get() {
        const value = this.getDataValue("validation_errors");
        return typeof value === "string" ? JSON.parse(value) : value;
      },
    },
    published_at: { type: DataTypes.DATE(3), allowNull: true },
    created_at: timestamp,
    updated_at: updatedTimestamp,
  },
  modelOptions("job_posts", {
    indexes: [
      { name: "ix_jobs_expiry", fields: ["status", "application_deadline"] },
      { name: "ix_jobs_company", fields: ["company_id", "status", "created_at"] },
      { name: "ix_jobs_filters", fields: ["industry_id", "location_id", "level_id"] },
      { name: "ix_jobs_feed", fields: ["status", "is_hidden", "published_at", "id"] },
      {
        name: "ix_jobs_location_feed",
        fields: ["location_id", "status", "is_hidden", "published_at", "id"],
      },
      {
        name: "ft_jobs_search",
        type: "FULLTEXT",
        fields: ["title", "description", "requirements"],
      },
    ],
  }),
);

module.exports = { Job_post };
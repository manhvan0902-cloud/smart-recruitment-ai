"use strict";

const { DataTypes, modelOptions, sequelize } = require("../base");

const Candidate_experience = sequelize.define(
  "Candidate_experience",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    candidate_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    company_name: { type: DataTypes.STRING(200), allowNull: false },
    job_title: { type: DataTypes.STRING(150), allowNull: false },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  modelOptions("candidate_experiences"),
);

module.exports = { Candidate_experience };
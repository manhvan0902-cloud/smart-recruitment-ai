"use strict";

const { DataTypes, modelOptions, sequelize } = require("../base");

const Candidate_education = sequelize.define(
  "Candidate_education",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    candidate_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    school_name: { type: DataTypes.STRING(200), allowNull: false },
    major: { type: DataTypes.STRING(150), allowNull: true },
    degree: { type: DataTypes.STRING(100), allowNull: true },
    start_date: { type: DataTypes.DATEONLY, allowNull: true },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  modelOptions("candidate_educations"),
);

module.exports = { Candidate_education };
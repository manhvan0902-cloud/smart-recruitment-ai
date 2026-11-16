"use strict";

const { DataTypes, modelOptions, sequelize } = require("../base");

const Candidate_project = sequelize.define(
  "Candidate_project",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    candidate_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    project_url: { type: DataTypes.STRING(500), allowNull: true },
    start_date: { type: DataTypes.DATEONLY, allowNull: true },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
  },
  modelOptions("candidate_projects"),
);

module.exports = { Candidate_project };
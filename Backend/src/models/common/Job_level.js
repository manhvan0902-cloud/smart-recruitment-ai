"use strict";

const { DataTypes, modelOptions, sequelize } = require("../base");

const Job_level = sequelize.define(
  "Job_level",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  modelOptions("job_levels"),
);

module.exports = { Job_level };
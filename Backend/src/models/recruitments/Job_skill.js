"use strict";

const { DataTypes, modelOptions, sequelize } = require("../base");

const Job_skill = sequelize.define(
  "Job_skill",
  {
    job_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      allowNull: false,
    },
    skill_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      allowNull: false,
    },
    is_required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    importance: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
  },
  modelOptions("job_skills"),
);

module.exports = { Job_skill };
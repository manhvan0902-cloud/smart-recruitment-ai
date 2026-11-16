"use strict";

const { DataTypes, modelOptions, sequelize } = require("../base");

const Candidate_skill = sequelize.define(
  "Candidate_skill",
  {
    candidate_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      allowNull: false,
    },
    skill_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      allowNull: false,
    },
    proficiency: {
      type: DataTypes.ENUM("BASIC", "INTERMEDIATE", "ADVANCED"),
      allowNull: true,
    },
    evidence: { type: DataTypes.TEXT, allowNull: true },
  },
  modelOptions("candidate_skills"),
);

module.exports = { Candidate_skill };
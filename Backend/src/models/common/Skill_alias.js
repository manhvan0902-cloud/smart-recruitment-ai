"use strict";

const { DataTypes, modelOptions, sequelize } = require("../base");

const Skill_alias = sequelize.define(
  "Skill_alias",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    skill_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    alias: { type: DataTypes.STRING(120), allowNull: false, unique: true },
  },
  modelOptions("skill_aliases"),
);

module.exports = { Skill_alias };
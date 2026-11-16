"use strict";

const { DataTypes, modelOptions, sequelize } = require("../base");

const Industry = sequelize.define(
  "Industry",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  modelOptions("industries"),
);

module.exports = { Industry };
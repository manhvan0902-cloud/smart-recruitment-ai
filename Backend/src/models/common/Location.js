"use strict";

const { DataTypes, modelOptions, sequelize } = require("../base");

const Location = sequelize.define(
  "Location",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  modelOptions("locations"),
);

module.exports = { Location };
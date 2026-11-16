"use strict";

const { DataTypes, modelOptions, sequelize } = require("../base");

const Employment_type = sequelize.define(
  "Employment_type",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  modelOptions("employment_types"),
);

module.exports = { Employment_type };
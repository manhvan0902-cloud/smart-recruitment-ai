"use strict";

const { DataTypes, modelOptions, sequelize } = require("../base");

const Candidate_certification = sequelize.define(
  "Candidate_certification",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    candidate_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    issuer: { type: DataTypes.STRING(200), allowNull: true },
    issued_date: { type: DataTypes.DATEONLY, allowNull: true },
    expires_date: { type: DataTypes.DATEONLY, allowNull: true },
    credential_url: { type: DataTypes.STRING(500), allowNull: true },
  },
  modelOptions("candidate_certifications"),
);

module.exports = { Candidate_certification };
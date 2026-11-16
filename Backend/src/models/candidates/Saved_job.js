"use strict";

const { DataTypes, modelOptions, sequelize, timestamp } = require("../base");

const Saved_job = sequelize.define(
  "Saved_job",
  {
    candidate_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      allowNull: false,
    },
    job_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      allowNull: false,
    },
    created_at: timestamp,
  },
  modelOptions("saved_jobs", {
    indexes: [
      {
        name: "ix_saved_candidate_created",
        fields: ["candidate_id", "created_at", "job_id"],
      },
    ],
  }),
);

module.exports = { Saved_job };
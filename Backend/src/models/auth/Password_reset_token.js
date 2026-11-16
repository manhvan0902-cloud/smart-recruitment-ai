"use strict";

const { DataTypes, modelOptions, sequelize, timestamp } = require("../base");

const Password_reset_token = sequelize.define(
  "Password_reset_token",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    token_hash: {
      type: DataTypes.CHAR(64),
      allowNull: false,
      unique: true,
    },
    expires_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
    },
    used_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
    },
    created_at: timestamp,
  },
  modelOptions("password_reset_tokens", {
    indexes: [{ name: "ix_reset_user", fields: ["user_id", "expires_at"] }],
  }),
);

module.exports = { Password_reset_token };

const {
  DataTypes,
  modelOptions,
  sequelize,
  timestamp,
  updatedTimestamp,
} = require("../base.js");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("CANDIDATE", "COMPANY", "ADMIN"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "LOCKED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    created_at: timestamp,
    updated_at: updatedTimestamp,
  },
  modelOptions("users", {
    indexes: [
      {
        name: "uq_users_username",
        unique: true,
        fields: ["username"],
      },
      {
        name: "ix_users_role_status_created",
        fields: ["role", "status", "created_at", "id"],
      },
    ],
  }),
);

module.exports = { User };

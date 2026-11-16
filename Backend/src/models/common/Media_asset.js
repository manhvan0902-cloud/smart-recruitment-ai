"use strict";

const { DataTypes, modelOptions, sequelize, timestamp } = require("../base");

const Media_asset = sequelize.define(
  "Media_asset",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    owner_user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    purpose: { type: DataTypes.ENUM("AVATAR", "LOGO", "CV"), allowNull: false },
    cloudinary_asset_id: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    public_id: { type: DataTypes.STRING(255), allowNull: false },
    resource_type: { type: DataTypes.ENUM("image", "raw"), allowNull: false },
    delivery_type: { type: DataTypes.ENUM("upload", "authenticated"), allowNull: false },
    version: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    original_name: { type: DataTypes.STRING(255), allowNull: false },
    mime_type: { type: DataTypes.STRING(100), allowNull: false },
    byte_size: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    file_sha256: { type: DataTypes.CHAR(64), allowNull: false },
    created_at: timestamp,
  },
  modelOptions("media_assets", {
    indexes: [
      {
        name: "uq_media_locator",
        unique: true,
        fields: ["public_id", "resource_type", "delivery_type"],
      },
      { name: "ix_media_owner", fields: ["owner_user_id", "purpose"] },
    ],
  }),
);

module.exports = { Media_asset };
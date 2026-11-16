const { DataTypes } = require("sequelize");
const { sequelize } = require("../configs/database");

function createTimestamp() {
  return {
    type: DataTypes.DATE(3),
    allowNull: false,
    defaultValue: sequelize.literal("CURRENT_TIMESTAMP(3)"),
  };
}

function createUpdatedTimestamp() {
  return {
    ...createTimestamp(),
    onUpdate: sequelize.literal("CURRENT_TIMESTAMP(3)"),
  };
}

const modelOptions = (tableName, options = {}) => ({
  tableName,
  timestamps: false,
  freezeTableName: true,
  ...options,
});

module.exports = {
  DataTypes,
  modelOptions,
  sequelize,
  get timestamp() {
    return createTimestamp();
  },
  get updatedTimestamp() {
    return createUpdatedTimestamp();
  },
};

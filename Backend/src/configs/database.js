const { Sequelize } = require("sequelize");
require("./environment");

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || "smart_recruitment",
  process.env.MYSQL_USER || "root",
  process.env.MYSQL_PASSWORD || "",
  {
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT || 3307),
    dialect: "mysql",
    timezone: "+00:00",
    logging: false,
    dialectOptions: { connectTimeout: 5000 },
    pool: { acquire: 10000 },
  },
);

module.exports = { sequelize };

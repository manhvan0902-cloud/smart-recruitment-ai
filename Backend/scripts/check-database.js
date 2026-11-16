const { sequelize } = require("../src/models");

async function checkDatabase() {
  try {
    await sequelize.authenticate();
    const tables = await sequelize.getQueryInterface().showAllTables();
    const expectedTables = Object.values(sequelize.models).map((model) => model.tableName);
    const missingTables = expectedTables.filter((table) => !tables.includes(table));
    if (missingTables.length) {
      throw new Error("Thiếu bảng: " + missingTables.join(", "));
    }
    for (const model of Object.values(sequelize.models)) {
      const columns = await sequelize.getQueryInterface().describeTable(model.tableName);
      const missingColumns = Object.keys(model.rawAttributes).filter((column) => !columns[column]);
      if (missingColumns.length) throw new Error(model.tableName + " thiếu cột: " + missingColumns.join(", "));
    }
    console.log("Kết nối thành công. Có đủ " + expectedTables.length + " bảng và các cột được model sử dụng.");
    console.log("Lệnh này chỉ đọc cấu trúc, không kiểm chứng toàn bộ constraint/index.");
  } catch (error) {
    console.error("Kiểm tra DB thất bại:", error.original?.code || error.code || error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

checkDatabase();

const app = require("./app");
const { sequelize, Job_post, Cv_document, Ai_task } = require("./models");
const { Op } = require("sequelize");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    await Cv_document.update(
      {
        processing_status: "FAILED",
        error_message: "Xử lý bị gián đoạn. Bạn có thể thử lại.",
      },
      {
        where: { processing_status: "PROCESSING" },
      },
    );
    await Ai_task.update(
      {
        status: "FAILED",
        error_code: "INTERRUPTED",
        error_message: "Xử lý bị gián đoạn.",
        finished_at: new Date(),
      },
      {
        where: { status: "RUNNING" },
      },
    );
    const expireJobs = async () => {
      await Job_post.update(
        { status: "EXPIRED" },
        {
          where: {
            status: "PUBLISHED",
            application_deadline: { [Op.lte]: new Date() },
          },
        },
      );
    };
    await expireJobs();
    console.log("Database connection has been established successfully.");
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`URL : http://localhost:${PORT}`);
    });
    server.on("error", async (error) => {
      console.error("Không mở được cổng HTTP:", error.message);
      process.exitCode = 1;
      clearInterval(timer);
      await sequelize.close();
    });
    const timer = setInterval(() => {
      expireJobs().catch((error) =>
        console.error("Không cập nhật được tin hết hạn:", error.message),
      );
    }, 60000);
    timer.unref();
    for (const signal of ["SIGINT", "SIGTERM"]) {
      process.once(signal, () => {
        clearInterval(timer);
        server.close(async () => {
          await sequelize.close();
        });
      });
    }
  } catch (error) {
    console.error("Không khởi động được backend:", error.message);
    process.exitCode = 1;
    await sequelize.close();
  }
};

startServer();

require("./configs/environment");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { sequelize } = require("./models");
const { authMiddleware, roleMiddleware } = require("./middleware/authMiddleware");
const AppError = require("./utils/AppError");
const errorHandler = require("./middleware/errorHandler");
const authRoute = require("./routes/auth/authRoute");
const userRoute = require("./routes/auth/userRoute");
const publicRecruitmentRoute = require("./routes/public/publicRecruitmentRoute");
const adminCompanyRoute = require("./routes/admin/adminCompanyRoute");
const candidateProfileRoute = require("./routes/candidates/candidateProfileRoute");
const candidateEducationRoute = require("./routes/candidates/candidateEducationRoute");
const candidateExperienceRoute = require("./routes/candidates/candidateExperienceRoute");
const candidateProjectRoute = require("./routes/candidates/candidateProjectRoute");
const candidateCertificationRoute = require("./routes/candidates/candidateCertificationRoute");
const candidateSkillRoute = require("./routes/candidates/candidateSkillRoute");
const candidateCatalogRoute = require("./routes/candidates/candidateCatalogRoute");
const candidateSavedJobRoute = require("./routes/candidates/candidateSavedJobRoute");
const candidateApplicationRoute = require("./routes/candidates/candidateApplicationRoute");
const candidateJobRoute = require("./routes/candidates/candidateJobRoute");
const candidateCvRoute = require("./routes/candidates/candidateCvRoute");
const candidateMatchRoute = require("./routes/candidates/candidateMatchRoute");
const candidateInterviewRoute = require("./routes/candidates/candidateInterviewRoute");
const candidateNotificationRoute = require("./routes/candidates/candidateNotificationRoute");
const candidateTaskRoute = require("./routes/candidates/candidateTaskRoute");
const candidateAiRoute = require("./routes/candidates/candidateAiRoute");
const recruiterCompanyRoute = require("./routes/recruiter/recruiterCompanyRoute");
const recruiterCompanyMediaRoute = require("./routes/recruiter/recruiterCompanyMediaRoute");
const recruiterJobRoute = require("./routes/recruiter/recruiterJobRoute");
const recruiterApplicationRoute = require("./routes/recruiter/recruiterApplicationRoute");
const recruiterInterviewRoute = require("./routes/recruiter/recruiterInterviewRoute");
const recruiterNotificationRoute = require("./routes/recruiter/recruiterNotificationRoute");
const recruiterAiRoute = require("./routes/recruiter/recruiterAiRoute");

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

app.get("/api/health", async (req, res, next) => {
  try {
    await sequelize.authenticate();
    return res.status(200).json({ status: "ok", database: "connected" });
  } catch (error) { return next(new AppError(503, "DATABASE_UNAVAILABLE", "Chưa kết nối được cơ sở dữ liệu.")); }
});
app.use("/api/auth", authRoute);
app.use("/api/public", publicRecruitmentRoute);

// Xác thực và phân quyền trước khi đi vào các route cùng khu vực.
app.use("/api/candidate", authMiddleware, roleMiddleware(["CANDIDATE"]));
app.use("/api/candidate", candidateProfileRoute);
app.use("/api/candidate", candidateEducationRoute);
app.use("/api/candidate", candidateExperienceRoute);
app.use("/api/candidate", candidateProjectRoute);
app.use("/api/candidate", candidateCertificationRoute);
app.use("/api/candidate", candidateSkillRoute);
app.use("/api/candidate", candidateCatalogRoute);
app.use("/api/candidate", candidateJobRoute);
app.use("/api/candidate", candidateSavedJobRoute);
app.use("/api/candidate", candidateApplicationRoute);
app.use("/api/candidate", candidateCvRoute);
app.use("/api/candidate", candidateMatchRoute);
app.use("/api/candidate", candidateInterviewRoute);
app.use("/api/candidate", candidateNotificationRoute);
app.use("/api/candidate", candidateTaskRoute);
app.use("/api/candidate", candidateAiRoute);

app.use("/api/recruiter", authMiddleware, roleMiddleware(["COMPANY"]));
app.use("/api/recruiter", recruiterCompanyRoute);
app.use("/api/recruiter", recruiterCompanyMediaRoute);
app.use("/api/recruiter", recruiterJobRoute);
app.use("/api/recruiter", recruiterApplicationRoute);
app.use("/api/recruiter", recruiterInterviewRoute);
app.use("/api/recruiter", recruiterNotificationRoute);
app.use("/api/recruiter", recruiterAiRoute);

app.use("/api/admin", authMiddleware, roleMiddleware(["ADMIN"]));
app.use("/api/admin", userRoute);
app.use("/api/admin", adminCompanyRoute);

app.use((req, res, next) => next(new AppError(404, "NOT_FOUND", "Không tìm thấy tài nguyên.")));
app.use(errorHandler);
module.exports = app;

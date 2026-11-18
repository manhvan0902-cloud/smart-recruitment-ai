# Cấu trúc backend sau khi sửa

Mỗi dòng dưới là một controller và một route riêng. Đường dẫn tính từ src/controllers và src/routes.

| Controller | Route |
|---|---|
| auth/authController | auth/authRoute.js |
| auth/userController | auth/userRoute.js |
| admin/adminCompanyController | admin/adminCompanyRoute.js |
| candidates/candidateApplicationController | candidates/candidateApplicationRoute.js |
| candidates/candidateCatalogController | candidates/candidateCatalogRoute.js |
| candidates/candidateCertificationController | candidates/candidateCertificationRoute.js |
| candidates/candidateCvController | candidates/candidateCvRoute.js |
| candidates/candidateEducationController | candidates/candidateEducationRoute.js |
| candidates/candidateExperienceController | candidates/candidateExperienceRoute.js |
| candidates/candidateInterviewController | candidates/candidateInterviewRoute.js |
| candidates/candidateJobController | candidates/candidateJobRoute.js |
| candidates/candidateMatchController | candidates/candidateMatchRoute.js |
| candidates/candidateNotificationController | candidates/candidateNotificationRoute.js |
| candidates/candidateProfileController | candidates/candidateProfileRoute.js |
| candidates/candidateProjectController | candidates/candidateProjectRoute.js |
| candidates/candidateSavedJobController | candidates/candidateSavedJobRoute.js |
| candidates/candidateSkillController | candidates/candidateSkillRoute.js |
| candidates/candidateTaskController | candidates/candidateTaskRoute.js |
| recruiters/recruiterApplicationController | recruiter/recruiterApplicationRoute.js |
| recruiters/recruiterCompanyMediaController | recruiter/recruiterCompanyMediaRoute.js |
| recruiters/recruiterCompanyController | recruiter/recruiterCompanyRoute.js |
| recruiters/recruiterInterviewController | recruiter/recruiterInterviewRoute.js |
| recruiters/recruiterJobController | recruiter/recruiterJobRoute.js |
| recruiters/recruiterNotificationController | recruiter/recruiterNotificationRoute.js |

## Cách đọc code

1. app.js nạp cấu hình và gắn middleware chung, xác thực/vai trò rồi gắn các route.
2. Route chỉ khai báo phương thức HTTP, URL và hàm controller. Không dùng vòng lặp sinh route.
3. Mỗi hàm controller nhận (req, res, next), kiểm tra đầu vào, truy vấn model rồi trả response.
4. Lỗi được chuyển qua next(error) đến middleware/errorHandler.js.
5. Chỉ dùng transaction khi cần nhiều thao tác cùng thành công hoặc cần khóa dòng để tránh ghi trùng.

Ví dụ học vấn: candidateEducationRoute.js gọi listEducations, createEducation, updateEducation hoặc deleteEducation trong candidateEducationController.js. Kinh nghiệm, dự án và chứng chỉ có các file riêng tương tự; không có factory CRUD hoặc candidateHelpers.js.

Những hàm kiểm tra ngắn như parsePositiveInteger/parsePagination được viết ngay trong controller sử dụng để dễ lần theo. Cấu hình DB/Cloudinary và băm mật khẩu vẫn có file riêng vì được nhiều chức năng sử dụng.

## Kiểm thử và giới hạn

Các bài unit/HTTP mock nằm trong Backend/tests/unit và Backend/tests/integration. Luồng DB thật nằm trong Backend/tests/database, chỉ chạy qua npm run test:database để tạo DB riêng. Dịch vụ Cloudinary được mô phỏng trong cả hai nhóm test; upload/download với tài khoản Cloudinary thật cần cấu hình và kiểm tra riêng.

Đối chiếu kỹ năng có chế độ quy tắc và chế độ AI kiểm tra bằng chứng. Các controller AI trong khu vực ứng viên/nhà tuyển dụng gọi `services/aiService.js`, dùng schema và hướng dẫn trong `services/recruitmentAiSchemas.js`. Nhà cung cấp mặc định là Groq, được chọn bằng AI_PROVIDER. Tác vụ lưu qua `Ai_task`, đối chiếu lưu qua `Match_result`, hồ sơ AI lưu trong `Cv_document.parsed_data`. Xem `ai-integration.md` để cấu hình và dùng bốn chức năng AI. Dashboard và quản trị danh mục vẫn còn trong phạm vi cần làm tiếp.

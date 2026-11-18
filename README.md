# Smart Recruitment AI

Backend tuyển dụng dùng Node.js, Express, Sequelize và MySQL/MariaDB. Frontend dùng React, JavaScript, Vite và Ant Design, đã có các luồng tuyển dụng đến giai đoạn 7 và giao diện AI dùng Groq Free mặc định. Xem [hướng dẫn frontend](Frontend/README.md) để cài và chạy.

## Chuẩn bị

- Node.js từ 22.16 trở lên; lần sửa này đã kiểm thử trên Node 24.16.
- MySQL/MariaDB local. SQL hiện tại hướng tới MariaDB trong XAMPP.
- Cloudinary để tải CV/logo thật. Các bài test không gọi Cloudinary thật.

## Cài và chạy trên Windows

Chạy trong thư mục Backend:

~~~powershell
npm.cmd ci
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
~~~

Điền chuỗi ngẫu nhiên vừa tạo vào JWT_SECRET trong Backend/.env. Điền cấu hình MYSQL_* và Cloudinary của bạn. MYSQL_PORT mặc định 3307; sửa theo cổng DB thực tế. Backend luôn đọc Backend/.env, không đọc src/.env.

Nếu chưa có database, nhập docs/database_tuyen_dung_final.sql bằng phpMyAdmin hoặc công cụ SQL. File này tạo 25 bảng và seed demo. Nếu đã có các bảng và dữ liệu, không nhập lại seed.

~~~powershell
npm.cmd run check:db
npm.cmd run dev
~~~

Backend mặc định http://localhost:3000. GET /api/health kiểm tra kết nối DB. CLIENT_ORIGIN mặc định http://localhost:5173. JWT gửi qua header Authorization: Bearer TOKEN; backend không dùng cookie phiên.

## Tài khoản demo local

Mật khẩu chung của seed: DemoLocal!2026.

| Vai trò | Email |
|---|---|
| Admin | admin@demo.local |
| Ứng viên | ungvien1@demo.local, ungvien2@demo.local |
| Công ty | congty1@demo.local, congty2@demo.local |

Đăng nhập bằng POST /api/auth/login với email và password. Đổi mật khẩu sẽ làm token cũ hết hiệu lực, cần đăng nhập lại.

## Route và controller

Mỗi controller có một file route tương ứng. Các route được import và gắn trực tiếp trong Backend/src/app.js. App kiểm tra đăng nhập/vai trò một lần cho mỗi khu vực.

- /api/auth: đăng ký, đăng nhập, đổi mật khẩu.
- /api/candidate: hồ sơ, học vấn, kinh nghiệm, dự án, chứng chỉ, kỹ năng, tin, việc lưu, đơn, CV, đối chiếu, lịch và thông báo.
- /api/recruiter: hồ sơ công ty, logo, tin, đơn, lịch và thông báo.
- /api/admin: danh sách/khóa tài khoản; danh sách/xác minh công ty.

Không có candidateHelpers.js hoặc recruiterHelpers.js. Những kiểm tra nhỏ nằm ngay trong controller đang dùng. CRUD viết thành từng hàm exports, không dùng factory sinh handler.

Xem docs/backend-structure.md, docs/candidate-api.md và docs/recruiter-api.md để biết cấu trúc và request cụ thể.

## Một số quy tắc cần biết

- Đăng ký COMPANY tạo cả tài khoản và công ty PENDING trong cùng transaction. Có thể gửi company_name khi đăng ký; sau đó dùng PATCH /api/recruiter/profile để hoàn thiện.
- Admin xác minh: PATCH /api/admin/companies/:companyId/verification, body { "status": "VERIFIED" }. Từ chối dùng REJECTED và note có lý do.
- Sửa tin và thay kỹ năng cần gửi revision hiện tại. Dữ liệu đã đổi trả 409 để tránh ghi đè từ cửa sổ cũ.
- Publish thiếu dữ liệu trả 422, lưu NEEDS_CHANGES và danh sách trường cần sửa.
- Tin chỉ xuất hiện/nhận hồ sơ khi công ty VERIFIED, tài khoản ACTIVE, tin PUBLISHED, không ẩn và còn hạn.
- CV là PDF tối đa 10 MB, multipart field file. Upload lưu tệp riêng tư; parse là bước trích xuất văn bản riêng. CV gốc vẫn dùng ứng tuyển khi chưa parse.
- Mỗi ứng viên nộp một lần cho một tin; chỉ rút khi SUBMITTED hoặc REVIEWING. Dữ liệu lúc nộp được chụp vào snapshot.
- Hoàn tất phỏng vấn: PATCH /api/recruiter/interviews/:interviewId/complete. Lịch phải được chấp nhận và đã kết thúc. OFFERED cần một lịch COMPLETED; HIRED chỉ đi từ OFFERED.

## Kiểm thử

~~~powershell
npm.cmd run check:syntax
npm.cmd run test:all
npm.cmd run test:database
~~~

- test:all chạy unit và HTTP API với DB/kho tệp được mô phỏng; không chấp nhận thiếu file test.
- test:database cần quyền tạo database local. Script tạo DB kiểm thử tên ngẫu nhiên, nhập SQL, chạy HTTP + ORM + parse PDF thật rồi tự xóa đúng DB đó. Không nhập seed vào database đang dùng. Cloudinary vẫn được mô phỏng để không cần Internet hoặc khóa thật.
- check:db chỉ đọc kết nối/cấu trúc database đang cấu hình, không thêm/sửa dữ liệu.

## Phạm vi hiện tại

Đã có đối chiếu kỹ năng theo quy tắc skill-overlap-v1 từ văn bản CV và alias, có trích dẫn bằng chứng. Phần AI bổ sung phân tích hồ sơ CV có cấu trúc, đối chiếu kỹ năng theo bằng chứng, tạo bản nháp JD và câu hỏi phỏng vấn. Điểm đối chiếu dựa trên kỹ năng, kinh nghiệm cần được xem xét riêng. Nếu tin yêu cầu kinh nghiệm thì điểm tổng để null. Mặc định dùng AI_PROVIDER=groq với model openai/gpt-oss-120b. Điền GROQ_API_KEY trong Backend/.env và khởi động lại backend để dùng dịch vụ trong hạn mức tài khoản Groq Free. Xem [cấu hình và cách dùng AI](docs/ai-integration.md).

Frontend đã có đăng ký, đăng nhập, đăng xuất phía trình duyệt, đổi mật khẩu, quản lý phiên và khung điều hướng theo vai trò. Giai đoạn 3 bổ sung hồ sơ/logo công ty, xác minh công ty và quản lý tài khoản admin. Giai đoạn 4 bổ sung quản lý tin tuyển dụng, kỹ năng yêu cầu, tìm kiếm, xem chi tiết và lưu/bỏ lưu việc làm. Giai đoạn 5 bổ sung hồ sơ ứng viên, CV, ứng tuyển, theo dõi/rút đơn và xem hồ sơ đã nộp ở cả hai vai trò. Giai đoạn 6 bổ sung xét duyệt đơn, ghi chú nội bộ, tạo/sửa/hủy/hoàn tất lịch và phản hồi phỏng vấn của ứng viên. Giai đoạn 7 bổ sung trích xuất văn bản PDF, đối chiếu kỹ năng từ CV, lịch sử kết quả/bằng chứng và thông báo có số chưa đọc. Giai đoạn 8 còn phần hoàn thiện và chuẩn bị demo. Giai đoạn 2 đến 7 chưa chạy kiểm thử hoặc build theo yêu cầu của người dùng.

Phần AI đã được viết mã với Groq mặc định và OpenAI tùy chọn, đang chờ cấu hình API key và kiểm thử theo yêu cầu người dùng. Dashboard, quên mật khẩu, các trang/API công khai và quản trị danh mục vẫn còn trong phạm vi cần triển khai sau.

PDF TAI_LIEU_HE_THONG.pdf là bản thiết kế ban đầu, còn khác phiên bản code ở JWT, prefix API, giới hạn tệp và một số phạm vi. README và các tài liệu API Markdown mô tả code hiện tại. Báo cáo rà soát 09/11/2026 lưu hiện trạng trước khi sửa.

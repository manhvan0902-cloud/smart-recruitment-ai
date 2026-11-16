# Phương án frontend — giai đoạn 1

Phương án đã được người dùng duyệt. Giai đoạn 2 đến 7 đã được viết mã. Giai đoạn 7 đang chờ người dùng duyệt trước khi tiếp tục. Kiểm thử thực hiện khi người dùng yêu cầu.

Tài liệu này xác định màn hình, menu, bố cục và cách trình bày các luồng tuyển dụng. Phương án dựa trên API hiện có trong `candidate-api.md`, `recruiter-api.md` và các route xác thực, quản trị của backend.

## 1. Định hướng chung

- Tên hiển thị đề xuất là **Smart Recruitment**. Tên dự án trong báo cáo vẫn có thể dùng Smart Recruitment AI.
- Ngôn ngữ giao diện là tiếng Việt.
- Công nghệ đã thống nhất là React, JavaScript, Vite, React Router, Ant Design và Fetch API.
- Một ứng dụng frontend phục vụ ba vai trò ứng viên, nhà tuyển dụng và quản trị viên.
- Vai trò `COMPANY` được hiển thị là “Nhà tuyển dụng”.
- Trang mặc định sau đăng nhập lần lượt là tìm việc, tin tuyển dụng và xác minh công ty.
- Danh sách việc làm dùng API dành cho ứng viên và cần đăng nhập.
- Các màn hình trong phương án được triển khai lần lượt ở giai đoạn 2 đến 8 theo kế hoạch đã thống nhất.

## 2. Màu sắc và chữ

| Thành phần | Giá trị đề xuất | Cách dùng |
|---|---|---|
| Màu chính | `#2563EB` | Nút chính, liên kết, mục menu đang chọn |
| Màu chính khi tương tác | `#1D4ED8` | Hover và trạng thái nhấn |
| Nền trang | `#F5F7FB` | Nền ngoài các khối nội dung |
| Nền nội dung | `#FFFFFF` | Biểu mẫu, bảng, thẻ việc làm |
| Chữ chính | `#172033` | Tiêu đề và nội dung chính |
| Chữ phụ | `#526078` | Chú thích, ngày tháng và thông tin bổ sung |
| Đường viền | `#DCE3ED` | Phân tách các khối và trường nhập |
| Thành công | `#15803D` | Đã xác minh, thao tác thành công |
| Cảnh báo | `#B45309` | Chờ xác minh, cần bổ sung |
| Lỗi | `#B91C1C` | Lỗi nhập liệu, thao tác thất bại |

Font đề xuất là Inter, dự phòng bằng các font sans-serif của hệ điều hành. Nội dung chính khoảng 16 px, chữ phụ từ 14 px, tiêu đề trang từ 24 đến 28 px.

Khoảng cách dùng các mức 8, 12, 16, 24 và 32 px. Các khối có góc bo khoảng 8 px, đường viền nhẹ. Trạng thái luôn có nhãn bằng chữ để người dùng hiểu được ý nghĩa khi màu sắc khó phân biệt.

Đây là lựa chọn thiết kế sơ bộ. Khả năng đọc, độ tương phản và cách hiển thị thực tế sẽ được kiểm tra khi người dùng yêu cầu kiểm thử.

## 3. Bố cục và menu

### 3.1. Khu vực tài khoản

Trang đăng nhập và đăng ký dùng biểu mẫu đặt giữa trang, chiều rộng khoảng 440 px. Phần đầu có tên ứng dụng và mô tả ngắn phục vụ thao tác đang làm. Trên điện thoại, biểu mẫu chiếm chiều rộng khả dụng với lề 16 px.

Đăng ký có hai lựa chọn “Ứng viên” và “Nhà tuyển dụng”. Trường tên công ty xuất hiện khi chọn nhà tuyển dụng. Đăng nhập thành công chuyển đến khu vực tương ứng với vai trò do backend trả về.

Đổi mật khẩu đặt trong menu tài khoản. Sau khi đổi thành công, giao diện đưa người dùng về đăng nhập vì backend vô hiệu hóa token cũ.

### 3.2. Khu vực ứng viên

Thanh trên cùng gồm tên ứng dụng, Tìm việc, Việc đã lưu, Đơn ứng tuyển, Lịch phỏng vấn, thông báo và menu tài khoản. Menu tài khoản có Hồ sơ cá nhân, CV của tôi, Đổi mật khẩu và Đăng xuất.

Nội dung căn giữa với chiều rộng tối đa khoảng 1200 px. Trang tìm việc có bộ lọc bên trái và danh sách việc làm bên phải. Các trang hồ sơ, CV và đơn ứng tuyển dùng các khối nội dung có tiêu đề và thao tác rõ ràng.

Trên điện thoại, menu thu vào bảng điều hướng mở bằng nút, bộ lọc mở bằng nút “Bộ lọc” và danh sách việc làm hiển thị một cột.

### 3.3. Khu vực nhà tuyển dụng

Menu bên trái rộng khoảng 240 px gồm Hồ sơ công ty, Tin tuyển dụng, Đơn ứng tuyển, Lịch phỏng vấn và Thông báo. Thanh trên cùng hiển thị tên công ty và menu tài khoản.

Trang mặc định là Tin tuyển dụng. Nội dung chính có tiêu đề trang, thao tác chính, bộ lọc và bảng hoặc danh sách. Trạng thái xác minh xuất hiện trong hồ sơ công ty và ở vị trí liên quan đến thao tác đăng tin.

Trên điện thoại, sidebar chuyển thành menu có thể mở và đóng. Bảng nhiều cột có vùng cuộn ngang. Các nút thao tác được gom lại nếu cần.

### 3.4. Khu vực quản trị viên

Menu bên trái gồm Xác minh công ty và Tài khoản. Trang mặc định là Xác minh công ty với bộ lọc ban đầu “Chờ xác minh”.

Chi tiết công ty mở trong bảng bên cạnh để admin xem hồ sơ và thực hiện xác minh hoặc nhập lý do từ chối. Trang tài khoản có tìm kiếm email, lọc vai trò và thao tác khóa hoặc mở khóa.

## 4. Danh sách màn hình và đường dẫn frontend

Đường dẫn dưới đây là đề xuất điều hướng trên trình duyệt. Các yêu cầu dữ liệu dùng prefix API tương ứng của backend.

### 4.1. Tài khoản và trang dùng chung

| Màn hình | Đường dẫn | Nội dung chính | Giai đoạn |
|---|---|---|---|
| Đăng nhập | `/login` | Email, mật khẩu, thông báo lỗi, liên kết đăng ký | 2 |
| Đăng ký | `/register` | Chọn vai trò, tên, email, mật khẩu, tên công ty khi phù hợp | 2 |
| Đổi mật khẩu | `/account/change-password` | Mật khẩu hiện tại, mật khẩu mới, xác nhận mật khẩu | 2 |
| Không đủ quyền | `/403` | Thông báo và nút về khu vực tài khoản được phép truy cập | 2 |
| Không tìm thấy trang | Đường dẫn không khớp | Thông báo và điều hướng về trang mặc định | 2 |

### 4.2. Ứng viên

| Màn hình | Đường dẫn | Nội dung chính | Giai đoạn |
|---|---|---|---|
| Tìm việc | `/candidate/jobs` | Từ khóa, ngành, địa điểm, cấp bậc, loại việc, hình thức làm việc, phân trang | 4 |
| Chi tiết việc làm | `/candidate/jobs/:jobId` | Công ty, lương, yêu cầu, quyền lợi, kỹ năng, hạn nộp, lưu việc, ứng tuyển | 4–5 |
| Việc đã lưu | `/candidate/saved-jobs` | Danh sách đã lưu, bỏ lưu, trạng thái tin | 4 |
| Hồ sơ cá nhân | `/candidate/profile` | Thông tin cá nhân, mong muốn và các tab dữ liệu hồ sơ | 5 |
| CV của tôi | `/candidate/cvs` | Upload, danh sách CV, tải xuống, lưu trữ, trạng thái xử lý | 5 |
| Chi tiết CV | `/candidate/cvs/:cvId` | Thông tin tệp, trích xuất văn bản, kết quả đối chiếu và lịch sử | 5–7 |
| Đơn ứng tuyển | `/candidate/applications` | Công việc đã nộp, công ty, ngày nộp, trạng thái | 5 |
| Chi tiết đơn | `/candidate/applications/:applicationId` | Hồ sơ đã nộp, trạng thái, lịch phỏng vấn, rút đơn khi đủ điều kiện | 5–6 |
| Lịch phỏng vấn | `/candidate/interviews` | Danh sách theo thời gian, địa điểm hoặc liên kết họp, phản hồi lịch | 6 |
| Thông báo | `/candidate/notifications` | Danh sách, số chưa đọc, đánh dấu đã đọc | 7 |

Hồ sơ cá nhân có các tab Thông tin chung, Học vấn, Kinh nghiệm, Dự án, Chứng chỉ và Kỹ năng. Biểu mẫu thêm hoặc sửa một mục mở bằng hộp thoại.

Ứng tuyển là hộp thoại mở từ chi tiết việc làm, gồm chọn CV đang hoạt động, thư giới thiệu và nút “Gửi hồ sơ”. Kết quả đối chiếu được mở từ CV tương ứng.

### 4.3. Nhà tuyển dụng

| Màn hình | Đường dẫn | Nội dung chính | Giai đoạn |
|---|---|---|---|
| Hồ sơ công ty | `/recruiter/profile` | Thông tin công ty, logo, trạng thái và ghi chú xác minh | 3 |
| Tin tuyển dụng | `/recruiter/jobs` | Danh sách, lọc trạng thái, tạo tin, xem đơn theo tin | 4 |
| Tạo tin | `/recruiter/jobs/new` | Thông tin vị trí, mô tả, yêu cầu, lương, hạn nộp; lưu nháp | 4 |
| Chi tiết và sửa tin | `/recruiter/jobs/:jobId` | Sửa thông tin, kỹ năng, điều kiện đăng, đăng hoặc đóng tin | 4 |
| Đơn ứng tuyển | `/recruiter/applications` | Lọc theo tin và trạng thái, thông tin ứng viên, ngày nộp | 6 |
| Chi tiết đơn | `/recruiter/applications/:applicationId` | Hồ sơ tại thời điểm nộp, CV, thư giới thiệu, ghi chú nội bộ, trạng thái, lịch | 6 |
| Lịch phỏng vấn | `/recruiter/interviews` | Danh sách, lọc trạng thái, sửa, hủy, hoàn tất lịch | 6 |
| Thông báo | `/recruiter/notifications` | Danh sách, số chưa đọc, đánh dấu đã đọc | 7 |

Tạo lịch phỏng vấn mở từ chi tiết đơn ứng tuyển. Khi chọn “Xem đơn” của một tin, trang danh sách đơn nhận bộ lọc `jobId` trên URL.

### 4.4. Quản trị viên

| Màn hình | Đường dẫn | Nội dung chính | Giai đoạn |
|---|---|---|---|
| Xác minh công ty | `/admin/companies` | Lọc trạng thái, xem hồ sơ, xác minh hoặc từ chối có lý do | 3 |
| Tài khoản | `/admin/users` | Tìm theo email, lọc vai trò, xem trạng thái, khóa hoặc mở khóa | 3 |

## 5. Bố cục các màn hình chính

### 5.1. Tìm việc

| Vị trí | Nội dung |
|---|---|
| Đầu trang | Thanh điều hướng ứng viên |
| Phần tìm kiếm | Tiêu đề “Tìm việc phù hợp”, ô từ khóa và nút “Tìm kiếm” |
| Cột trái | Ngành nghề, địa điểm, cấp bậc, loại việc, hình thức làm việc, nút xóa bộ lọc |
| Cột phải | Tổng số kết quả, các thẻ việc làm và phân trang |
| Mỗi thẻ | Tiêu đề, tên công ty, lương, địa điểm, hình thức làm việc, hạn nộp, nút lưu |

Lương thương lượng hiển thị “Thương lượng”. Dữ liệu lương hiện tại được trình bày theo VND/tháng. Trang dùng danh mục backend cung cấp để tạo lựa chọn bộ lọc.

### 5.2. Chi tiết việc làm

Phần đầu hiển thị tên vị trí, tên công ty, lương, địa điểm và hạn nộp. Hai thao tác chính là “Ứng tuyển” và “Lưu việc”. Nội dung dưới gồm mô tả, yêu cầu, quyền lợi và kỹ năng. Thông tin tóm tắt công ty hiển thị ở cột bên phải trên màn hình rộng và nằm sau nội dung trên điện thoại.

### 5.3. Quản lý tin tuyển dụng

Phần đầu có tiêu đề “Tin tuyển dụng” và nút “Tạo tin”. Dưới là bộ lọc trạng thái và bảng các cột Tiêu đề, Trạng thái, Hạn nộp, Ngày đăng và Thao tác. Một hàng cho phép mở chi tiết, xem đơn, đăng hoặc đóng tùy trạng thái.

Biểu mẫu tin chia thành các phần Thông tin vị trí, Nội dung tuyển dụng, Lương và điều kiện, Kỹ năng yêu cầu. Sau khi tạo nháp, người dùng tiếp tục bổ sung kỹ năng và đăng từ trang chi tiết. Lỗi điều kiện đăng xuất hiện trong một khối thông báo kèm các trường cần sửa.

### 5.4. Chi tiết đơn dành cho nhà tuyển dụng

Phần đầu hiển thị tên ứng viên, vị trí ứng tuyển, ngày nộp và trạng thái. Nội dung chính có hồ sơ đã nộp, thư giới thiệu và thao tác tải CV. Một khối riêng chứa ghi chú nội bộ và chuyển trạng thái. Phần phỏng vấn chứa danh sách lịch cùng thao tác tạo lịch.

Các dữ liệu hồ sơ sử dụng snapshot do API trả về. Ghi chú nội bộ chỉ xuất hiện ở khu vực nhà tuyển dụng.

### 5.5. Quản lý CV và kết quả đối chiếu

Danh sách CV hiển thị tên, ngày tải lên, trạng thái trích xuất và các thao tác. Chi tiết CV có nút “Trích xuất văn bản” và “Đối chiếu kỹ năng”. Khi đối chiếu, người dùng có thể chọn tối đa 20 tin từ danh sách việc làm truy cập được.

Kết quả gồm tên việc làm, điểm kỹ năng, điểm tổng nếu đủ dữ liệu, kỹ năng khớp, kỹ năng còn thiếu, bằng chứng trích từ CV và gợi ý bổ sung. Điểm tổng `null` được trình bày là “Chưa đủ dữ liệu đánh giá”. Phần giải thích ghi rõ kết quả dựa trên kỹ năng xuất hiện trong văn bản CV.

### 5.6. Lịch phỏng vấn

Thiết kế ban đầu dùng danh sách theo thời gian. Mỗi lịch thể hiện vị trí, người liên quan, thời gian bắt đầu/kết thúc, múi giờ, hình thức, trạng thái và phản hồi của ứng viên. Phỏng vấn trực tuyến có liên kết họp, phỏng vấn trực tiếp có địa điểm.

Ứng viên có hai thao tác “Chấp nhận” và “Từ chối” khi lịch còn được phép phản hồi. Nhà tuyển dụng có các thao tác sửa, hủy và hoàn tất khi đủ điều kiện.

## 6. Quy tắc hiển thị theo nghiệp vụ

| Tình huống | Cách giao diện xử lý |
|---|---|
| Công ty chờ xác minh | Hiển thị nhãn “Chờ xác minh” và giải thích điều kiện đăng tin |
| Công ty bị từ chối | Hiển thị lý do và hướng người dùng cập nhật hồ sơ |
| Đổi tên công ty | Thông báo hồ sơ sẽ trở về trạng thái chờ xác minh |
| Tin thiếu điều kiện đăng | Hiển thị các trường cần bổ sung, giữ dữ liệu biểu mẫu |
| Revision tin đã thay đổi | Hiển thị xung đột và cung cấp thao tác tải lại bản mới |
| Tin đã đóng hoặc hết hạn | Thông báo trạng thái, điều chỉnh các thao tác ứng tuyển |
| Đã ứng tuyển | Hiển thị thông báo và đường dẫn đến danh sách đơn |
| Rút đơn | Chỉ hiển thị thao tác cho SUBMITTED hoặc REVIEWING, có bước xác nhận |
| CV mới tải lên | Cho phép dùng CV để ứng tuyển; hiển thị thao tác trích xuất riêng |
| CV đang xử lý | Hiển thị trạng thái đang xử lý và khóa thao tác xử lý lặp |
| CV xử lý thất bại | Hiển thị thông báo và thao tác thử lại |
| PDF thiếu lớp văn bản | Hiển thị hướng dẫn dùng PDF có văn bản |
| Lịch được thay đổi nội dung cần xác nhận | Hiển thị phản hồi trở về chờ xác nhận theo dữ liệu backend |
| Chuyển trạng thái tuyển dụng | Chỉ đưa ra các lựa chọn hợp lệ theo trạng thái hiện tại |
| Gửi đề nghị làm việc | Hiển thị điều kiện có lịch phỏng vấn hoàn tất |
| Đổi mật khẩu hoặc token hết hạn | Xóa phiên phía frontend và chuyển về đăng nhập |

Nhãn trạng thái đề xuất dùng thống nhất trên các trang.

| Nhóm | Mã backend và nhãn tiếng Việt |
|---|---|
| Công ty | PENDING — Chờ xác minh; VERIFIED — Đã xác minh; REJECTED — Bị từ chối |
| Tin | DRAFT — Bản nháp; NEEDS_CHANGES — Cần bổ sung; PUBLISHED — Đang đăng; CLOSED — Đã đóng; EXPIRED — Hết hạn |
| Đơn | SUBMITTED — Đã nộp; REVIEWING — Đang xem xét; INTERVIEW — Phỏng vấn; OFFERED — Đề nghị làm việc; HIRED — Đã tuyển; REJECTED — Bị từ chối; WITHDRAWN — Đã rút |
| Lịch | SCHEDULED — Đã lên lịch; COMPLETED — Hoàn tất; CANCELLED — Đã hủy |
| Phản hồi lịch | PENDING — Chờ phản hồi; ACCEPTED — Đã chấp nhận; DECLINED — Đã từ chối |
| CV | UPLOADED — Đã tải lên; QUEUED — Chờ xử lý; PROCESSING — Đang xử lý; READY — Đã trích xuất; FAILED — Xử lý thất bại |
| Tài khoản | ACTIVE — Hoạt động; LOCKED — Đã khóa |

## 7. Thành phần dùng chung và trạng thái trang

- Nút, trường nhập và biểu mẫu dùng các thành phần Ant Design.
- Tiêu đề trang kèm thao tác chính khi cần.
- Bảng phân trang cho quản lý và thẻ nội dung cho danh sách việc làm.
- Nhãn trạng thái dùng cùng một cách dịch và màu theo ý nghĩa.
- Hộp thoại xác nhận cho rút đơn, đóng tin, hủy lịch, lưu trữ CV và khóa tài khoản.
- Lỗi nhập liệu hiển thị cạnh trường tương ứng khi API cung cấp đủ thông tin.
- Lỗi thao tác hiển thị trong biểu mẫu hoặc khối nội dung liên quan.
- Trong lúc gửi yêu cầu, nút thể hiện đang xử lý và hạn chế gửi lặp.
- Trang tải dữ liệu có trạng thái đang tải.
- Danh sách rỗng có thông báo phù hợp và thao tác tiếp theo nếu có.
- Khi tải thất bại có thông báo và nút thử lại.
- Trạng thái trống, tải và lỗi được thiết kế như một phần của từng màn hình.
- Liên kết từ thông báo cần được ánh xạ theo vai trò, gồm các đường dẫn backend đang trả như `/applications/:id` hoặc `/company/profile`.

## 8. Liên hệ giữa màn hình và API

| Nhóm giao diện | API chính |
|---|---|
| Đăng ký, đăng nhập, đổi mật khẩu | `/api/auth/register`, `/api/auth/login`, `/api/auth/change-password` |
| Hồ sơ ứng viên | `/api/candidate/profile`, `/educations`, `/experiences`, `/projects`, `/certifications`, `/skills` |
| Tìm và lưu việc | `/api/candidate/jobs`, `/api/candidate/saved-jobs` |
| CV và đối chiếu | `/api/candidate/cvs`, `/api/candidate/cvs/:cvId/parse`, `/api/candidate/cvs/:cvId/matches` |
| Ứng tuyển | `/api/candidate/jobs/:jobId/applications`, `/api/candidate/applications` |
| Công ty và logo | `/api/recruiter/profile`, `/api/recruiter/profile/logo` |
| Tin tuyển dụng | `/api/recruiter/jobs` và các route chi tiết, kỹ năng, đăng, đóng |
| Xét tuyển | `/api/recruiter/applications` và các route chi tiết, trạng thái, tải CV |
| Lịch | Các route `/interviews` trong khu vực ứng viên và nhà tuyển dụng |
| Thông báo | Các route `/notifications` trong khu vực ứng viên và nhà tuyển dụng |
| Quản trị | `/api/admin/users`, `/api/admin/companies` và các route trạng thái, xác minh |

Các đường dẫn con của hồ sơ ứng viên trong bảng dùng chung prefix `/api/candidate`. Phương thức HTTP và chi tiết request tuân theo tài liệu API, route và controller tương ứng.

## 9. Luồng demo dự kiến

1. Nhà tuyển dụng đăng ký và hoàn thiện hồ sơ công ty.
2. Admin xem hồ sơ, xác minh công ty.
3. Nhà tuyển dụng tạo nháp, bổ sung kỹ năng và đăng tin.
4. Ứng viên hoàn thiện hồ sơ, tải CV, tìm tin và ứng tuyển.
5. Nhà tuyển dụng xem hồ sơ và chuyển sang xem xét.
6. Nhà tuyển dụng tạo lịch, ứng viên chấp nhận.
7. Sau khi lịch kết thúc, nhà tuyển dụng hoàn tất phỏng vấn, gửi đề nghị và cập nhật đã tuyển.
8. Ứng viên xem trạng thái và thông báo.
9. Ứng viên mở CV, trích xuất và xem đối chiếu kỹ năng với tin tuyển dụng.

## 10. Điểm duyệt và bước tiếp theo

Người dùng duyệt tên hiển thị, màu sắc, bố cục, menu và danh sách màn hình trong tài liệu này. Các lựa chọn thiết kế là đề xuất và có thể chỉnh trước khi triển khai.

Sau khi được duyệt, giai đoạn 2 khởi tạo frontend, xây dựng layout dùng chung và các chức năng tài khoản, kết nối API cùng điều hướng theo vai trò.

Theo yêu cầu của người dùng, kiểm thử được thực hiện khi người dùng nói “test giúp tôi”. Trạng thái kiểm thử của giai đoạn 1 là **chưa kiểm thử**.

## 11. Tiến độ giai đoạn 6

Đã bổ sung giao diện xét duyệt, ghi chú nội bộ và lịch phỏng vấn cho hai vai trò. Chi tiết đơn có lựa chọn trạng thái theo luồng backend và khối lịch liên quan; menu Lịch phỏng vấn mở danh sách riêng có lọc trạng thái, phân trang và liên kết hồ sơ.

Tạo lịch áp dụng cho đơn REVIEWING/INTERVIEW. Ứng viên phản hồi trước giờ bắt đầu khi lịch SCHEDULED/PENDING và đơn INTERVIEW. Hoàn tất áp dụng cho lịch được chấp nhận, đã kết thúc và đơn INTERVIEW. OFFERED cần lịch COMPLETED; HIRED đi từ OFFERED. Các thao tác hủy lịch, phản hồi và chuyển trạng thái có hộp thoại xác nhận.

Biểu mẫu và nội dung thời gian dùng Việt Nam (UTC+7). Lịch mới lưu Asia/Ho_Chi_Minh, lịch cũ giữ timezone_name khi sửa. Thay đổi nội dung yêu cầu xác nhận được backend đưa về PENDING. Màn hình có trạng thái tải/lỗi/trống, tải lại dữ liệu, giữ nội dung biểu mẫu khi lưu lỗi và bố cục một cột trên điện thoại.

Chưa chạy kiểm thử, build hoặc mở trình duyệt. Dừng sau giai đoạn 6 để người dùng quyết định bước tiếp theo. Giai đoạn 7 dự kiến bổ sung trích xuất CV, đối chiếu kỹ năng và thông báo.

## 12. Tiến độ giai đoạn 7

Đã bổ sung trích xuất PDF ở chi tiết CV, trạng thái xử lý/lỗi, thử lại theo thao tác người dùng và xác nhận khi trích xuất lại. CV đang xử lý được đọc lại trạng thái có giới hạn; không tự gửi lại yêu cầu trích xuất. PDF ảnh có hướng dẫn về lớp văn bản.

Ứng viên mở đối chiếu từ CV hoặc chi tiết việc làm, chọn tối đa 20 tin hoặc dùng nhóm tin mới nhất. Trang kết quả có lịch sử phân trang, điểm kỹ năng/điểm tổng tham khảo, kỹ năng tìm thấy/chưa tìm thấy, bằng chứng, gợi ý, thông tin xử lý và cảnh báo phiên bản dữ liệu cũ. Nhãn mô tả đúng phương pháp skill-overlap-v1, chưa dùng AI và chưa suy luận kinh nghiệm. Điểm thiếu cơ sở không hiển thị thành 0.

Ứng viên và nhà tuyển dụng có hộp thông báo, lọc chưa đọc, đánh dấu một/tất cả đã đọc và mở đích theo vai trò. Chuông thanh đầu trang hiển thị số chưa đọc, được cập nhật định kỳ khi tab hiển thị và khi quay lại cửa sổ. Danh sách có tải lại thủ công. Đường dẫn cũ được ánh xạ sang route hiện tại; đường dẫn ngoài hoặc không nhận diện không được mở tự động.

Không thêm dependency, migration hoặc nhà cung cấp AI. API thông báo bổ sung bộ lọc unread=true và giữ phạm vi người dùng đăng nhập. Giai đoạn 7 chưa chạy kiểm thử, build hoặc kiểm tra trình duyệt theo yêu cầu. Dừng tại đây, chờ người dùng quyết định sang giai đoạn 8 hoặc yêu cầu kiểm thử.

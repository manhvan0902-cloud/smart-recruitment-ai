# Báo cáo rà soát Smart Recruitment AI

> Đây là hiện trạng trước khi sửa. Cấu trúc và hướng dẫn của phiên bản đã sửa nằm trong README.md và docs/backend-structure.md; các tên file cũ dưới đây được giữ để lưu lịch sử rà soát.

Ngày kiểm tra: 09/11/2026. Môi trường: Windows, Node.js v24.16.0.

## 1. Kết luận và phạm vi

Dự án hiện là backend đang phát triển cùng bộ thiết kế dữ liệu và nghiệp vụ. Backend chưa khởi động được ở trạng thái hiện tại. Chưa đủ điều kiện trình diễn xuyên suốt từ đăng ký, đăng tin đến ứng tuyển và phỏng vấn. Frontend mới có thư mục rỗng; chưa có ứng dụng React. Phần AI mới có model dữ liệu và các route dự kiến.

Đã đọc toàn bộ 54 file JavaScript trong `Backend/src`, README, `.gitignore`, hai tài liệu API, SQL và nội dung 23 trang PDF. Đã kiểm tra package manifest, metadata dependency và lockfile; không kiểm toán từng file thư viện bên thứ ba trong `node_modules` hay dữ liệu nội bộ `.git`.

Đã chạy kiểm tra cú pháp, nạp module, một số probe cô lập với mock để tránh truy cập DB, kiểm tra scrypt và đối chiếu tên cột model với SQL. Không sửa mã nguồn nghiệp vụ, không import SQL, không gọi Cloudinary hoặc AI, không thay đổi dữ liệu người dùng. Báo cáo này là file được thêm trong lần rà soát.

Chưa kiểm thử HTTP tích hợp, ràng buộc trên DB thật, upload/download thật, giao diện hoặc khả năng chịu tải. Những phát hiện suy ra từ mã nguồn và sai lệch so với thiết kế được ghi riêng với lỗi đã tái hiện. Các chức năng thiếu là khoảng trống so với tài liệu, không được tính là đã triển khai chỉ vì có route hoặc model.

Mức ưu tiên: **P1** chặn luồng chính, ảnh hưởng quyền truy cập hoặc tính đúng dữ liệu; **P2** cần sửa trước khi nghiệm thu nhưng có thể xử lý sau các lỗi P1. Đây là mức ưu tiên của đồ án, không phải điểm CVSS.

## 2. Kết quả chạy kiểm tra

| Kiểm tra | Kết quả thực tế |
|---|---|
| `node --check` toàn bộ source | 53/54 file qua cú pháp; `src/configs/cloudinary.js` lỗi `Unexpected end of input` |
| `require('./src/app')` | Thất bại: không tìm thấy `./routes/candidateRoutes` |
| Kiểm tra relative import | 7 vị trí import không resolve được; chi tiết ở mục 3 |
| Nạp trực tiếp candidate/recruiter route | Cùng thất bại vì thiếu `candidateHelpers.js` |
| Nạp CV controller | Thất bại vì `require(" node:crypto")` có khoảng trắng |
| `npm.cmd test` | Exit thành công nhưng **0 test**, không chứng minh tính đúng |
| `npm.cmd run test:integration` | Exit thành công nhưng **0 test** |
| `npm.cmd run check:db` | Thất bại vì thiếu `scripts/check-database.js` |
| `hashPassword()` hiện tại | `ERR_CRYPTO_INVALID_SCRYPT_PARAMS`, memory limit exceeded |
| Cùng tham số scrypt, tăng maxmem lên 32 MiB | Chạy được trong môi trường kiểm tra |
| Xác minh mật khẩu demo trong SQL | Thành công bằng `verifyPassword()`; đây không phải kiểm thử đăng nhập HTTP |
| Probe hồ sơ với `req.user = {id: 2}` | Điều kiện truy vấn trở thành `user_id: undefined`; Sequelize từ chối sinh SQL |
| Probe candidate activity | 5 handler đã gọi đều lỗi `ReferenceError` do thiếu import helper |
| Đối chiếu tên cột model/SQL | Không phát hiện cột lệch sau khi tính cả `ALTER TABLE users ADD username` ở cuối SQL |
| Đếm schema | **25 bảng, 43 khóa ngoại**, khác header SQL ghi 26/44 |
| Lockfile | Dependency trực tiếp ở root khớp `package.json` |
| `npm.cmd ci --dry-run --ignore-scripts --offline --no-audit --no-fund` | Cảnh báo peer Cloudinary không tương thích; dừng ở `ENOTCACHED`. Chưa xác nhận cài sạch thành công |

PowerShell chặn `npm.ps1` theo execution policy nên các lệnh trên dùng `npm.cmd`. Đây là đặc điểm môi trường, không phải lỗi source.

## 3. Lỗi và hướng sửa

### F01 — P1: app import sai đường dẫn route

- Vị trí: `Backend/src/app.js:18`, `:19`.
- Đang dùng `./routes/candidateRoutes` và `./routes/recruiterRoutes`; file thật nằm trong `routes/candidates/` và `routes/recruiter/`.
- Đã tái hiện lỗi nạp app. Sửa thành `./routes/candidates/candidateRoutes` và `./routes/recruiter/recruiterRoutes`.
- Sau khi sửa vẫn còn F02, F04 và F05; không thể coi sửa hai dòng này là đã chạy được server.

### F02 — P1: thiếu file helper dùng chung

- Vị trí: `candidateDataController.js:23`, `candidateJobController.js:27`, `recruiterHelpers.js:16`.
- `candidateHelpers.js` không tồn tại. Hầu hết chức năng candidate và recruiter phụ thuộc file này nên route không thể nạp.
- Cần triển khai rõ hợp đồng cho `assertObjectBody`, `parsePositiveInteger`, `parsePagination`, `pickAllowedFields`, `paginatedResponse`, `getCandidateProfile`. ID phải hợp lệ, phân trang có giới hạn, không cho client tự chọn chủ sở hữu.
- Nên đặt helper độc lập trong `utils` hoặc service dùng chung để recruiter không phải phụ thuộc module candidate chỉ để phân trang.

### F03 — P1: cấu hình scrypt làm đăng ký và đổi mật khẩu thất bại

- Vị trí: `Backend/src/utils/password.js:16`.
- `maxmem` hiện là 16.779.264 byte. Với `N=16384, r=8, p=1`, `hashPassword()` đã báo lỗi thiếu bộ nhớ trên Node đang cài.
- `register()` và `changePassword()` đều gọi hàm này nên sẽ thất bại khi đi đến bước băm mật khẩu.
- Cùng tham số, dùng 32 MiB đã chạy được trong probe. Nên thống nhất cách tính memory budget cho hash và verify, giữ salt ngẫu nhiên và so sánh constant-time.
- Thêm test hash/verify đúng mật khẩu, sai mật khẩu và tương thích hash seed. Hash seed đang xác minh được vì nhánh verify có memory budget tối thiểu 32 MiB.

### F04 — P1: import crypto của CV sai một ký tự

- Vị trí: `Backend/src/controllers/candidates/candidateCvController.js:3`.
- `require(" node:crypto")` phải là `require("node:crypto")`. Đã tái hiện `MODULE_NOT_FOUND`.

### F05 — P1: route CV dùng callback chưa được export

- Vị trí: `candidateRoutes.js:50`, `:56`, `:57`, `:58`; `candidateCvController.js:35`, `:270`.
- Route yêu cầu `uploadMiddleware`, `uploadCv`, `listCvTasks`, `createCvMatches`, `listCvMatches`; controller không export các hàm này. Hàm có sẵn mang tên `uploadCV` với chữ hoa khác biệt.
- Dù sửa import, Express vẫn không đăng ký được các route có handler `undefined`.
- Export middleware bằng `uploadCv.single("file")` hoặc đổi tên biến cho rõ; thống nhất `uploadCv`/`uploadCV`. Các chức năng chưa làm phải bỏ khỏi route/tài liệu hiện hành hoặc triển khai đầy đủ.
- `candidateCvRoute.js` cũng mới có import, chưa tạo/export router; không nên giữ hai bộ route CV nửa hoàn chỉnh.

### F06 — P1: nhiều helper được gọi nhưng không khai báo/import

- `candidateActivityController.js:10`: thiếu `parsePagination`, `paginatedResponse`, `parsePositiveInteger`, `pickAllowedFields`.
- `candidateCvController.js:94`, `:117`, `:122`, `:165`: thiếu `parsePagination`, `paginatedResponse`, `parsePositiveInteger`, `publicCv`, `configureCloudinary`.
- Đã tái hiện `ReferenceError` ở `listInterviews`, `respondToInterview`, `listNotifications`, `markNotificationRead`, `getAiTask`.
- Cần bổ sung implementation/import thực tế, rồi kiểm tra từng handler; kiểm tra cú pháp đơn thuần không phát hiện các lỗi này.

### F07 — P1: xử lý upload CV không khớp model và chưa lưu tệp

- Vị trí: `candidateCvController.js:45`, `:48`, `:58`, `:61`; đối chiếu `models/candidates/Cv_document.js:10`.
- `cvHash` chưa được khai báo; model không có cột `hash`. Hash tệp nằm ở `media_assets.file_sha256`.
- `PDFParse(cvBuffer)` không khớp cách dùng class hiện có ở chính `parseCv`: `new PDFParse({data})`, `getText()`, `destroy()`.
- `Cv_document.create()` thiếu `file_asset_id` và `name`, đều bắt buộc. Đoạn upload chưa tải lên Cloudinary và chưa tạo `Media_asset`.
- Cần hoàn thiện một luồng: kiểm tra nội dung PDF → hash → upload `raw/authenticated` với định danh mới → tạo media và CV trong transaction → dọn tệp nếu DB lỗi. Không bắt buộc parse thành công mới được lưu CV gốc.

### F08 — P1: toàn bộ API profile lấy sai ID đăng nhập

- Vị trí: `candidate_profile_Controller.js:8`, `:37`, `:94`; đối chiếu `authMiddleware.js:38`.
- Middleware gán Sequelize User vào `req.user`, có `id`; controller lại đọc `userId`. Cả đọc, tạo và sửa đều dùng ID `undefined`.
- Đã xác nhận bằng probe và query generator. Cần dùng `req.user.id` nhất quán.

### F09 — P1: điều kiện xem tin và ứng tuyển thiếu trạng thái công ty

- Vị trí: `candidateJobController.js:47`, `:111`, `:141`, `:181`.
- `availableJobWhere()` chỉ lọc tin đã đăng, không ẩn và hạn nộp. Không ràng buộc `Company.verification_status = VERIFIED` và tài khoản công ty `ACTIVE`.
- Theo mã hiện tại, khi công ty bị khóa hoặc mất xác minh, tin đã đăng vẫn có thể được tìm thấy và nhận hồ sơ nếu các điều kiện khác còn đúng.
- Dùng cùng điều kiện nghiệp vụ cho tìm kiếm, chi tiết, lưu việc và ứng tuyển; khi ứng tuyển cần kiểm tra trong transaction. Nên dùng hạn nộp `> now` và không cho tin PUBLISHED thiếu deadline lọt qua dữ liệu cũ.
- Đây là phát hiện từ truy vấn source; chưa chạy tình huống khóa công ty trên DB thật.

### F10 — P1: snapshot ứng tuyển chưa đủ để tái phân tích đúng phiên bản

- Vị trí: `candidateJobController.js:183`, `:211`, `:233`.
- Query lúc nộp chỉ include công ty, không lấy kỹ năng tin. `job_snapshot` thiếu kỹ năng, `is_required`, `importance`, và không chụp `education_requirement`.
- `cv_snapshot` thiếu `file_asset_id`; metadata file chỉ có tên, MIME, dung lượng và hash.
- Khi kỹ năng tin đổi sau khi nộp hoặc CV cần phân tích lại, snapshot không đủ tự xác định toàn bộ đầu vào lịch sử theo thiết kế.
- Chụp kỹ năng và trọng số trong cùng transaction với revision; chụp định danh media bất biến. Quy định rõ profile snapshot cần chứa những phần học vấn, kinh nghiệm, kỹ năng nào.

### F11 — P1: API nhà tuyển dụng trộn snapshot với hồ sơ đang thay đổi

- Vị trí: `recruiterApplicationController.js:49`, `:164`.
- Chi tiết đơn trả cả snapshot lúc nộp lẫn hồ sơ hiện tại, toàn bộ học vấn, kinh nghiệm, dự án, chứng chỉ và dữ liệu CV hiện tại.
- Thay đổi sau khi nộp có thể làm thông tin hiển thị khác bản đã gửi, đồng thời đưa cho công ty dữ liệu mới ứng viên bổ sung sau này.
- Theo thiết kế hồ sơ nộp bất biến, nên lấy bản đã nộp làm nguồn hiển thị/chấm điểm. Nếu muốn xem hồ sơ mới nhất, cần quyết định rõ phạm vi chia sẻ và gắn nhãn khác với bản nộp.

### F12 — P1: pipeline cho phép bỏ qua các bước tuyển dụng đã quy định

- Vị trí: `recruiterApplicationController.js:27`, `:216`.
- Hiện cho `REVIEWING → OFFERED/HIRED` và `INTERVIEW → HIRED`; không kiểm tra lịch `COMPLETED` trước OFFERED.
- Thiết kế PDF quy định `REVIEWING → INTERVIEW → OFFERED → HIRED`, với phỏng vấn hoàn tất trước OFFERED. Không có API đánh dấu phỏng vấn COMPLETED.
- Khi đơn bị REJECTED/HIRED, lịch tương lai SCHEDULED chưa được hủy trong cùng transaction.
- Chốt lại state machine, thêm thao tác hoàn tất phỏng vấn và kiểm thử toàn bộ cạnh hợp lệ/không hợp lệ. Nếu cố ý rút gọn nghiệp vụ, cập nhật thiết kế và tiêu chí nghiệm thu tương ứng.

### F13 — P1: cập nhật avatar không kiểm tra quyền sở hữu tài nguyên

- Vị trí: `candidate_profile_Controller.js:43`, `:69`, `:124`.
- Client được gửi thẳng `avatar_asset_id`; chưa kiểm tra asset thuộc `req.user.id`, đúng `purpose=AVATAR` và loại ảnh.
- Sau khi sửa F08, chỉ kiểm tra FK tồn tại vẫn không đủ bảo vệ quyền sở hữu. Người dùng có thể gán ID tài nguyên của tài khoản khác hoặc tài nguyên sai mục đích.
- Nên dùng endpoint upload avatar có kiểm quyền; ít nhất validate owner, purpose và resource type trước khi gán.

### F14 — P1: đổi tên công ty vẫn giữ trạng thái VERIFIED

- Vị trí: `recruiterCompanyController.js:113`.
- `updateProfile()` lưu tên mới nhưng không yêu cầu xác minh lại. Theo thiết kế, sửa dữ liệu nhận diện quan trọng phải đưa về PENDING; sửa mô tả/logo có thể giữ trạng thái.
- Cần xác định chính xác trường nào yêu cầu xác minh lại và thực hiện chuyển trạng thái trong transaction; kết hợp F09 để tin ngừng công khai đúng lúc.

### F15 — P1: kiểm thử đang cho cảm giác thành công khi không có test

- Vị trí: `Backend/package.json:10` và `:13`.
- Cả unit/integration script thực tế chạy 0 test; thư mục tests và script kiểm tra DB không tồn tại.
- Cần thêm test nghiệp vụ thực tế, cấu hình để CI không coi 0 test là hoàn tất, và cung cấp hoặc bỏ script `check:db` không tồn tại.

### F16 — P2: file Cloudinary chưa hoàn chỉnh, route/controller cũ chưa dọn

- `configs/cloudinary.js:14` kết thúc ngay sau phần mở hàm; không đóng ngoặc và không export. Hiện không được app dùng nên lỗi này chưa phải nguyên nhân đầu tiên của startup failure.
- `auth/userController.js:2` import `Role.js` không tồn tại và query `role_id`, trong khi schema dùng enum `role`. File chưa được route hiện hành gắn vào app.
- Nếu khôi phục `getUsersInfo`, phải giới hạn quyền, phân trang và chỉ chọn cột cần thiết; `User.findAll()` hiện không loại `password_hash`. Đây là rủi ro nếu gắn route, chưa phải endpoint rò rỉ đang hoạt động.
- `condidate_profile_Route.js` trùng trách nhiệm route mới và dùng PUT thay PATCH. Nên chọn một bộ route chính, sửa tên file và bỏ mã bỏ dở khỏi luồng dùng thật.

### F17 — P2: cấu hình môi trường không nhất quán và thiếu mẫu chạy

- Vị trí: `configs/database.js:5`, `configs/cloudinary.js:4`, `server.js:4`, `app.js:11`.
- DB dotenv trỏ `Backend/src/.env`, còn dotenv mặc định của Cloudinary phụ thuộc thư mục chạy. Không có `.env.example` trong cây dự án.
- Code dùng `MYSQL_*`, mặc định DB port 3307, HTTP port 3000, `/api`; PDF dùng `DB_*`, 3306, 5000, `/api/v1` và cơ chế cookie.
- Sequelize hiện có timezone mặc định `+00:00`; không phát hiện lỗi timezone ở thiết lập này. Nên cấu hình UTC rõ ràng để tránh người sửa sau hiểu nhầm.
- Nạp/validate env tại một nơi trước các module phụ thuộc, thêm `.env.example` không chứa bí mật, chốt origin và prefix API. JWT cần `JWT_SECRET` nhưng chưa có hướng dẫn cấu hình.

### F18 — P2: PATCH profile không thể xóa giá trị và không cập nhật version

- Vị trí: `candidate_profile_Controller.js:120`.
- Cách gán `newValue || oldValue` không nhận `0`, chuỗi rỗng hay `null`; ví dụ không thể đưa lương mong muốn về 0 hoặc bỏ headline.
- Phân biệt field không gửi với field gửi null, validate kiểu/độ dài/enum/ID và tăng `profile_version` khi dữ liệu đầu vào thay đổi. Các thay đổi học vấn/kinh nghiệm/kỹ năng cũng cần chính sách version nhất quán.
- Các handler profile tự trả `error.message` và 500 cho mọi lỗi, làm lộ chi tiết nội bộ và biến lỗi input thành lỗi server; nên chuyển qua error handler chung.

### F19 — P2: tự kiểm tra tin và vòng đời tin chưa đủ theo thiết kế

- Vị trí: `recruiterJobController.js:163`, `:305`, `:341`, `:351`.
- Publish chưa yêu cầu địa chỉ onsite/hybrid, ít nhất một kỹ năng required hoặc tái kiểm tra danh mục đang hoạt động nếu danh mục bị tắt sau khi tạo nháp.
- Lỗi publish chỉ throw 400; không lưu `validation_errors` hay đưa tin sang NEEDS_CHANGES như tài liệu. Sửa tin PUBLISHED không đạt thì từ chối toàn bộ thay đổi, khác thiết kế lưu rồi chuyển NEEDS_CHANGES.
- CLOSED/EXPIRED không được sửa/đăng lại. Không có tiến trình đánh dấu EXPIRED; bộ lọc deadline hiện vẫn giúp loại tin hết hạn trong danh sách tìm việc.
- Không nhận revision client đã đọc để phát hiện sửa từ hai cửa sổ. `closeJob()` đọc rồi ghi revision mà không có transaction bao quanh lần đọc, có nguy cơ ghi revision từ dữ liệu cũ khi thao tác đồng thời.
- Cần chốt behavior cuối cùng, dùng một service kiểm tra tin, khóa cùng dòng khi thay đổi và trả 409 khi revision không khớp. Nguy cơ đồng thời chưa được kiểm thử trên DB thật.

### F20 — P2: rút đơn, phản hồi lịch và thông báo còn lệch nghiệp vụ

- `candidateJobController.js:363`: chỉ rút được SUBMITTED; PDF cho cả REVIEWING. Nếu đây là thay đổi chủ ý, cần cập nhật tài liệu.
- `candidateActivityController.js:59`: phản hồi chỉ kiểm tra SCHEDULED/PENDING, không kiểm tra `starts_at > now`; lịch đã bắt đầu vẫn có thể được trả lời.
- `recruiterInterviewController.js:264`: mọi sửa đổi đều reset phản hồi về PENDING, kể cả chỉ sửa lời nhắn; nên xác định những thay đổi nào cần ứng viên xác nhận lại.
- Luồng nộp đơn và phản hồi lịch chưa tạo thông báo cho công ty. Hiện các thao tác phía recruiter có tạo thông báo cho ứng viên, nhưng chiều ngược lại còn thiếu.

### F21 — P2: tổng số việc đã lưu có thể bị nhân theo số kỹ năng

- Vị trí: `candidateJobController.js:121`.
- `Saved_job.findAndCountAll()` include job rồi include quan hệ nhiều-nhiều `skills`, không có xử lý đếm distinct.
- Một tin có nhiều kỹ năng có thể làm `count` lớn hơn số việc lưu. Với seed có nhiều kỹ năng/tin, đây là tình huống cần kiểm thử sớm.
- Dùng truy vấn count theo khóa việc lưu/`job_id` trong phạm vi candidate, hoặc count riêng để xử lý đúng khóa ghép. Chưa chạy SQL count trên DB thật.

### F22 — P2: đổi mật khẩu chưa thu hồi JWT đã cấp

- Vị trí: `authController.js:83`, `:118`; `authMiddleware.js:21`.
- Token có hạn nhưng không có token version/session được đối chiếu sau đổi mật khẩu. Token cũ vẫn được chấp nhận tới khi hết hạn nếu tài khoản còn ACTIVE.
- Middleware hiện kiểm tra trạng thái user ở DB mỗi request, đây là điểm tốt cho khóa tài khoản. Có thể bổ sung `token_version`, thời điểm đổi mật khẩu hoặc session server-side nếu cần thu hồi toàn bộ token.
- JWT Bearer vẫn là lựa chọn triển khai có thể dùng cho đồ án; cần cập nhật PDF thay vì trộn với yêu cầu cookie/session. Không nên coi CORS `*` là tự động vượt được JWT; nên giới hạn origin và thêm giới hạn tần suất auth phù hợp.

### F23 — P2: cleanup logo bỏ sót trường hợp mở transaction thất bại

- Vị trí: `recruiterCompanyMediaController.js:89`.
- Tệp đã upload, nhưng `sequelize.transaction()` nằm ngoài try. Nếu không mở được transaction thì không chạy cleanup Cloudinary, có thể để tệp mồ côi.
- Đưa việc mở transaction vào phạm vi xử lý cleanup; chỉ rollback transaction chưa kết thúc và giữ tác vụ dọn lại nếu xóa bên ngoài thất bại.
- Xóa logo cũng nên được kiểm thử khi upload/xóa đồng thời; hiện đọc company rồi gỡ logo không khóa cùng dòng xuyên suốt thao tác. Đây là rủi ro suy ra từ mã, chưa mô phỏng Cloudinary thật.

### F24 — P2: parse PDF chưa có giới hạn thời gian và trạng thái lỗi rõ ràng

- Vị trí: `candidateCvController.js:213`, `:221`, `:227`, `:248`.
- `fetch()` chưa có timeout; đọc hết `arrayBuffer()` mới kiểm tra dung lượng thực. Chưa giới hạn số trang hoặc lượng văn bản giải nén.
- Parse chạy đồng bộ trong request; khi lỗi không cập nhật trạng thái FAILED/error_message cho CV. Khi sửa các helper, cần xử lý cả luồng lỗi và retry, tránh lưu trạng thái không phản ánh lần xử lý vừa rồi.
- Giữ thông báo PDF scan không có văn bản là hành vi đúng; OCR nên là phần mở rộng có quyết định phạm vi rõ ràng.

### F25 — P2: server báo lỗi nhưng có thể kết thúc với exit code thành công

- Vị trí: `server.js:20`.
- Khối catch chỉ log khi kết nối DB thất bại, không đặt `process.exitCode = 1`. Công cụ chạy tự động có thể hiểu sai trạng thái khởi động.
- Nên fail rõ ràng khi thiếu env/DB và có health endpoint. Bổ sung xử lý lỗi listen và shutdown đóng kết nối khi cần.

### F26 — P2: peer dependency Cloudinary không khớp

- Vị trí: `Backend/package.json:21`, `:29`; metadata của `multer-storage-cloudinary@4.0.0`.
- Adapter yêu cầu `cloudinary ^1.21.0`, dự án dùng `cloudinary ^2.11.0`. Cài hiện có không chứng minh một clone mới cài sạch được.
- Mã logo đang upload stream trực tiếp qua SDK. Có thể bỏ adapter nếu không còn dùng sau khi hoàn thiện service upload, hoặc chọn bộ phiên bản tương thích rồi tạo lại lockfile và xác nhận `npm ci`.
- Dry run offline đã cảnh báo peer và dừng vì thiếu cache, nên chưa kết luận kết quả cài online. Không chạy audit bảo mật dependency qua registry trong lần kiểm tra này.

### F27 — P2: tài liệu không phản ánh một phiên bản triển khai thống nhất

- SQL header ghi 26 bảng/44 FK, thực tế có 25/43. PDF còn mô tả `user_sessions`, SQL/model hiện không có bảng này.
- PDF hướng tới MySQL 8, SQL ghi MariaDB 10.4.32. Cần chọn hệ DB chạy demo và kiểm tra DDL, CHECK, JSON, lỗi constraint trên đúng engine; chưa có kết quả import DB thật trong lần rà soát này.
- PDF quy định PDF/DOCX 5 MB; code/API Markdown chọn PDF 10 MB. Đây là quyết định phạm vi cần chốt, không phải tự động phải thêm DOCX.
- PDF dùng ESM/mysql2, code dùng CommonJS/Sequelize. Hai cách đều có thể dùng, nhưng hướng dẫn khởi tạo phải phù hợp code thực tế.
- PDF trỏ các file `01_schema.sql`, `02_seed_demo.sql`, sơ đồ và báo cáo SQL chưa có trong repo; README chỉ có tên dự án.
- `candidate-api.md` mô tả matching `skill-overlap-v1` nhưng controller chưa có implementation. Phải phân biệt đã làm, đang làm, dự kiến.
- `errorHandler.js:48` dùng thông báo 10 MB cho mọi upload, trong khi logo chỉ 5 MB. Các response profile dùng `success/message`, phần lớn module khác dùng `data/error`; nên thống nhất hợp đồng và errors theo field.

## 4. Các chức năng chưa triển khai đầy đủ

| Phần | Hiện trạng | Tác động với demo |
|---|---|---|
| Frontend | Chỉ có thư mục, chưa có package/source ứng dụng | Chưa có luồng sử dụng bằng giao diện |
| Admin | Có role và seed admin, chưa có route/controller quản trị | Công ty đăng ký mới PENDING không có luồng admin để xác minh |
| AI | Có `Ai_task`, `Match_result`; thiếu provider, worker, schema output, matching, JD, câu hỏi | Chưa có bằng chứng tính năng AI hoạt động |
| Hồ sơ từ AI | Chưa có preview/xác nhận/apply profile | Chưa đáp ứng luồng ứng viên kiểm tra dữ liệu AI |
| Xác thực bổ sung | Chưa có me/logout/forgot/reset theo thiết kế | Thiếu các luồng tài khoản đã mô tả; JWT có thể cần thiết kế khác session |
| Trang/API công khai | Tin đang đặt trong router yêu cầu CANDIDATE; chưa có API công ty công khai | Khách chưa tìm/xem việc theo thiết kế |
| Thống kê | Chưa có API công ty/admin | Chưa có dashboard số liệu thật |
| Hoàn tất phỏng vấn | Chưa có endpoint chuyển COMPLETED | Không hoàn thành được pipeline chặt chẽ theo thiết kế |
| Đăng ký công ty | Chỉ tạo User; company được tạo bằng endpoint khác | Khác thiết kế tạo user + company PENDING cùng transaction; có thể giữ quy trình hai bước nếu tài liệu/UI giải thích rõ |

Nên xác nhận phạm vi nghiệm thu với giảng viên. Không nhất thiết cần microservices, Redis, Kubernetes, chat, thanh toán hay OCR để làm tốt bản local này.

## 5. Thứ tự sửa đề xuất

1. **Dựng được backend:** F01–F06, F16–F17. Tiêu chí: clone mới cấu hình theo README, cài dependency, nạp toàn bộ route và health trả kết quả đúng.
2. **Đăng nhập và dữ liệu cá nhân:** F03, F08, F13, F18, F22. Tiêu chí: đăng ký mới được, mật khẩu hoạt động, ứng viên chỉ sửa tài nguyên của mình, cập nhật null/0 đúng.
3. **Hoàn thành tuyển dụng thủ công:** admin xác minh tối thiểu, F07, F09–F12, F14, F19–F21. Tiêu chí: công ty tạo tin → admin xác minh → đăng tin → ứng viên upload/nộp CV → công ty xử lý → phỏng vấn → kết quả.
4. **Làm frontend tối thiểu cho luồng trên:** bố cục ba vai trò, form và bảng đủ dùng, trạng thái loading/empty/error, thông báo và phân trang. Chưa cần làm đẹp mọi trang trước khi chạy xuyên suốt.
5. **Tích hợp AI có thể đánh giá:** tách trích xuất CV và chấm điểm; output JSON phải qua schema; lưu evidence; kết quả thiếu bằng chứng dùng null. Queue xử lý có timeout/retry, AI lỗi không rollback hồ sơ ứng tuyển.
6. **Hoàn thiện bàn giao:** test thực tế, kiểm tra DB đúng engine, sửa tài liệu và các script; CI chạy syntax/lint/test và không chấp nhận 0 test.

Về kiến trúc, giữ một backend và một DB. Controller nhận/trả HTTP; chuyển nghiệp vụ ứng tuyển, publish, pipeline, media và AI vào service để có thể kiểm thử. Chưa cần viết lại toàn dự án hoặc đổi ORM chỉ vì tài liệu ban đầu dùng cách khác.

Về AI, trọng số phải là giả thuyết có đánh giá. Nên có bộ CV/JD gán nhãn, tách mẫu chỉnh prompt khỏi mẫu đánh giá, đo trích xuất kỹ năng và chất lượng top-k gợi ý, thời gian xử lý, tỷ lệ lỗi/thiếu bằng chứng. Không lấy thông tin nhạy cảm để chấm điểm và không trình bày điểm như xác suất tuyển dụng. Chưa có số đo thì không ghi thành tích trong báo cáo đồ án.

## 6. Kiểm thử nên bổ sung trước nghiệm thu

| Nhóm | Tình huống có giá trị |
|---|---|
| Startup | Tất cả route nạp được; thiếu JWT/DB config thất bại rõ ràng; health phản ánh DB |
| Mật khẩu | Hash/verify round-trip, sai mật khẩu, hash seed, đổi mật khẩu và chính sách token cũ |
| Quyền | Candidate A không đọc/sửa CV, lịch, hồ sơ của B; công ty A không đọc đơn công ty B; không được gán avatar của người khác |
| Tin | Công ty PENDING/LOCKED không công khai/nhận hồ sơ; deadline vừa hết; tin ẩn; thiếu skill/address; danh mục đã tắt |
| Đồng thời | Hai request nộp một tin chỉ một thành công; đóng/sửa tin khi nộp; sửa từ hai cửa sổ; thay kỹ năng khi chụp snapshot |
| CV | Sai MIME/extension/nội dung, quá dung lượng, PDF rỗng/scan, Cloudinary thành công nhưng DB lỗi, mở transaction lỗi |
| Snapshot | Sửa job skill/profile hoặc parse lại CV sau khi nộp không thay đầu vào lịch sử; nhà tuyển dụng xem đúng bản đã gửi |
| Pipeline | Không được bỏ bước; OFFERED cần điều kiện phỏng vấn; kết thúc đơn hủy lịch tương lai; không phản hồi lịch đã bắt đầu |
| Phân trang | Một việc có nhiều skill vẫn được đếm một; một đơn nhiều lịch không nhân tổng số đơn |
| AI | Timeout, lỗi provider, JSON sai, prompt injection trong CV, bằng chứng không tồn tại, thiếu kinh nghiệm, khoảng thời gian trùng |
| Tái lập | Chạy từ clone mới theo README, restart backend không nhập lại seed, giữ được dữ liệu |

## 7. Danh sách file đã rà soát

Các model trong bảng dưới đã được đọc, nạp và đối chiếu tên cột với SQL; điều này không đồng nghĩa tất cả constraint/index đã được kiểm chứng trên DB thật.

| File/nhóm file | Ghi nhận |
|---|---|
| `README.md` | Thiếu hướng dẫn cài, env, DB, chạy, test, tài khoản demo, phạm vi AI |
| `.gitignore` | Đã bỏ qua node_modules/env/coverage/logs và cho phép env.example; nên thêm output build/temp nếu tạo sau |
| `Backend/package.json` | Script test/check DB và peer dependency cần sửa; nên khai báo Node engine phù hợp môi trường đã kiểm thử |
| `Backend/package-lock.json` | Root dependency khớp manifest; chưa xác nhận clean install |
| `docs/candidate-api.md` | Khớp một phần route dự kiến, nhưng CV/matching chưa hoạt động |
| `docs/recruiter-api.md` | Cần bổ sung/chốt vòng đời tin, phỏng vấn hoàn tất và các giới hạn hiện có |
| `docs/database_tuyen_dung_final.sql` | 25 bảng/43 FK; FK CV-owner và application-context có thiết kế tốt; cần import test đúng engine |
| `docs/TAI_LIEU_HE_THONG.pdf` | Đã đọc nội dung đủ 23 trang; còn sai lệch so với source/SQL; không kiểm tra xuất bản/in ấn |
| `Backend/src/app.js` | F01, F17 |
| `Backend/src/server.js` | F25 |
| `Backend/src/configs/database.js` | F17 |
| `Backend/src/configs/cloudinary.js` | F16 |
| `Backend/src/utils/password.js` | F03 |
| `Backend/src/utils/AppError.js` | Chưa thấy lỗi riêng từ kiểm tra tĩnh |
| `Backend/src/middleware/authMiddleware.js` | Kiểm tra user ACTIVE và role có sẵn; F22 về thu hồi token |
| `Backend/src/middleware/errorHandler.js` | Nền tảng xử lý lỗi tốt; cần thống nhất input errors, lỗi theo field và giới hạn upload |
| `Backend/src/routes/auth/authRoute.js` | Ba route auth chính; các luồng bổ sung chưa có |
| `Backend/src/routes/candidates/candidateRoutes.js` | F02, F05 |
| `Backend/src/routes/candidates/candidateCvRoute.js` | Chưa tạo/export router |
| `Backend/src/routes/candidates/condidate_profile_Route.js` | Route trùng và tên sai chính tả |
| `Backend/src/routes/recruiter/recruiterRoutes.js` | Bị chặn bởi F02; chưa có complete interview/statistics/AI |
| `Backend/src/controllers/auth/authController.js` | Bị ảnh hưởng F03; transaction đăng ký candidate là hướng đúng; F22 |
| `Backend/src/controllers/auth/userController.js` | Model Role/role_id cũ không còn khớp; F16 |
| `Backend/src/controllers/candidates/candidate_profile_Controller.js` | F08, F13, F18 |
| `Backend/src/controllers/candidates/candidateDataController.js` | F02; cần schema input và chính sách tăng profile_version |
| `Backend/src/controllers/candidates/candidateJobController.js` | F02, F09, F10, F20, F21 |
| `Backend/src/controllers/candidates/candidateCvController.js` | F04–F07, F24; AI/matching còn thiếu |
| `Backend/src/controllers/candidates/candidateActivityController.js` | F06, F20 |
| `Backend/src/controllers/recruiters/recruiterHelpers.js` | F02 |
| `Backend/src/controllers/recruiters/recruiterCompanyController.js` | F14 |
| `Backend/src/controllers/recruiters/recruiterCompanyMediaController.js` | Có kiểm tra chữ ký ảnh; F23 |
| `Backend/src/controllers/recruiters/recruiterJobController.js` | F19 |
| `Backend/src/controllers/recruiters/recruiterApplicationController.js` | F11, F12; có kiểm tra company ownership |
| `Backend/src/controllers/recruiters/recruiterInterviewController.js` | F12, F20; có kiểm tra ISO timezone và meeting HTTPS |
| `Backend/src/controllers/recruiters/recruiterNotificationController.js` | Có scope user; phụ thuộc helper thiếu, nguồn tạo thông báo còn thiếu |
| `Backend/src/models/base.js` | Dùng timestamps do DB quản lý; tránh thêm sync tự thay schema khi chưa quyết định migration |
| `Backend/src/models/index.js` | Quan hệ/alias đã nạp được; `constraints:false` nghĩa DB thật phải được tạo từ SQL/migration có FK |
| `Backend/src/models/auth/User.js` | Khớp SQL sau ALTER username; role enum phù hợp source auth |
| `Backend/src/models/auth/Password_reset_token.js` | Có model; chưa có luồng reset |
| `Backend/src/models/common/Location.js` | Khớp tên cột; chưa thấy lỗi riêng |
| `Backend/src/models/common/Industry.js` | Khớp tên cột; chưa thấy lỗi riêng |
| `Backend/src/models/common/Skill.js` | Khớp tên cột; chưa thấy lỗi riêng |
| `Backend/src/models/common/Skill_alias.js` | Có dữ liệu chuẩn hóa; chưa có service AI sử dụng |
| `Backend/src/models/common/Job_level.js` | Khớp tên cột; chưa thấy lỗi riêng |
| `Backend/src/models/common/Employment_type.js` | Khớp tên cột; chưa thấy lỗi riêng |
| `Backend/src/models/common/Media_asset.js` | Hash nằm ở model này; quyền owner/purpose vẫn cần backend kiểm tra |
| `Backend/src/models/common/Interview.js` | Có COMPLETED nhưng chưa có API hoàn tất |
| `Backend/src/models/common/Notification.js` | Khớp tên cột; thiếu producer ở một số luồng |
| `Backend/src/models/candidates/Candidate_profile.js` | Có profile_version nhưng controller chưa tăng |
| `Backend/src/models/candidates/Candidate_education.js` | Khớp tên cột; cần validate request và ngày |
| `Backend/src/models/candidates/Candidate_experience.js` | Khớp tên cột; cần validate request và ngày |
| `Backend/src/models/candidates/Candidate_project.js` | Khớp tên cột; cần validate request và URL |
| `Backend/src/models/candidates/Candidate_certification.js` | Khớp tên cột; cần validate request, ngày và URL |
| `Backend/src/models/candidates/Candidate_skill.js` | Khóa ghép phù hợp; thay skills cần kiểm thử đồng thời/version |
| `Backend/src/models/candidates/Cv_document.js` | Model đúng cấu trúc SQL; upload controller không khớp |
| `Backend/src/models/candidates/Saved_job.js` | Khóa ghép phù hợp; kiểm tra count có join |
| `Backend/src/models/candidates/Application.js` | Có snapshot và unique chống nộp trùng; cần chụp đủ dữ liệu và giữ bất biến |
| `Backend/src/models/recruitments/Company.js` | Có trạng thái xác minh; thiếu luồng admin và tái xác minh |
| `Backend/src/models/recruitments/Job_post.js` | Có revision và validation_errors nhưng nghiệp vụ chưa dùng đầy đủ |
| `Backend/src/models/recruitments/Job_skill.js` | Trọng số cần có trong snapshot lúc nộp |
| `Backend/src/models/ai/Ai_task.js` | Có cấu trúc tác vụ; thiếu producer/worker/retry |
| `Backend/src/models/ai/Match_result.js` | Có cấu trúc điểm/bằng chứng; chưa có chức năng tạo kết quả |
| `Frontend/`, `database/` | Không có file ứng dụng trong các thư mục này ở thời điểm kiểm tra |

Tại thời điểm bắt đầu, Git chỉ theo dõi `README.md`; `.gitignore`, `Backend/` và `docs/` đang untracked. Cần lưu các thay đổi hợp lệ vào lịch sử phiên bản trước khi bàn giao; báo cáo không tự stage hoặc commit các file này.

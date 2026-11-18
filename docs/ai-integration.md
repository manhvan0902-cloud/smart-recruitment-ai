# Tích hợp AI với Groq Free

Backend dùng Groq làm nhà cung cấp mặc định cho phân tích CV, đối chiếu kỹ năng, tạo JD và câu hỏi phỏng vấn. Để sử dụng, tạo API key từ tài khoản Groq Free, điền vào cấu hình backend rồi khởi động lại server.

## Cấu hình

Đăng nhập [Groq Console](https://console.groq.com/keys), tạo khóa và giữ trong `Backend/.env`. Gói Free và hạn mức được quản lý ở tài khoản Groq. Hướng dẫn chính thức có tại [Groq Quickstart](https://console.groq.com/docs/quickstart).

```dotenv
AI_PROVIDER=groq
GROQ_API_KEY=YOUR_GROQ_API_KEY
GROQ_MODEL=openai/gpt-oss-120b
GROQ_TIMEOUT_MS=90000
GROQ_MAX_OUTPUT_TOKENS=4096
```

File `Backend/.env.example` có các mục tương ứng. `.env` hiện tại đã được đặt `AI_PROVIDER=groq`, thêm các mục Groq còn thiếu với khóa để trống. Sau khi điền khóa, khởi động lại backend theo cách đang dùng, ví dụ chạy `npm.cmd run dev` trong thư mục `Backend`.

Model mặc định `openai/gpt-oss-120b` được gọi qua Groq và hỗ trợ Structured Outputs chế độ strict. Tài liệu [Groq Structured Outputs](https://console.groq.com/docs/structured-outputs) mô tả các model tương thích. Thời gian chờ cấu hình từ 1.000 đến 180.000 ms, giới hạn đầu ra từ 1.000 đến 20.000 token. Mặc định 4.096 token đầu ra giúp giảm lượng token mỗi yêu cầu. GPT-OSS dùng reasoning effort low, API chỉ lấy nội dung kết quả.

Theo [hạn mức Groq Free](https://console.groq.com/docs/rate-limits) kiểm tra ngày 16/11/2026, model này có mức tham khảo 30 yêu cầu/phút, 1.000 yêu cầu/ngày, 8.000 token/phút và 200.000 token/ngày. Hạn mức áp dụng cho tổ chức sử dụng khóa, dùng chung giữa các tài khoản phần mềm. Xem Limits trong Groq Console để biết hạn mức thực tế. Gói miễn phí phụ thuộc chính sách và model được Groq cung cấp tại thời điểm dùng.

CV dài hoặc nhiều trích dẫn có thể vượt hạn mức token, ngay cả khi nằm trong giới hạn đầu vào của ứng dụng. Khi gặp `AI_TOKEN_LIMIT`, dùng CV ngắn hơn hoặc giảm `GROQ_MAX_OUTPUT_TOKENS`. Khi gặp `AI_INCOMPLETE`, cần rút gọn nội dung hoặc cân đối lại giới hạn đầu ra với quota tài khoản. HTTP 429 có thời gian chờ từ nhà cung cấp sẽ được chuyển thành header `Retry-After`, trường `retryAfterSeconds` và gợi ý trên giao diện.

Frontend gọi backend bằng JWT hiện có. Backend gửi khóa trong header xác thực tới `https://api.groq.com/openai/v1/chat/completions`. Các route đọc lịch sử chỉ trả dữ liệu của người đăng nhập trong phạm vi CV, tin hoặc đơn thuộc quyền truy cập. Thông báo lỗi dùng mã lỗi nội bộ và nội dung đã chuẩn hóa.

Backend chọn nhà cung cấp bằng `AI_PROVIDER`. Cấu hình cũ có thể chọn `openai` cùng các biến `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`, `OPENAI_MAX_OUTPUT_TOKENS`. Mỗi yêu cầu chỉ dùng nhà cung cấp đã chọn. Kết quả mới ghi tên nhà cung cấp trong metadata và mã thuật toán, lịch sử OpenAI trước đây tiếp tục được nhận diện theo mã đã lưu.

## Chức năng và cách sử dụng

### Phân tích CV

Ứng viên mở **CV của tôi → Chi tiết**, trích xuất văn bản PDF, sau đó chọn **Phân tích CV bằng AI**. Kết quả có tóm tắt, kỹ năng, học vấn, kinh nghiệm và dự án kèm trích dẫn từ CV. Có thể xem lại các lần xử lý trong lịch sử ngay trên trang.

Kết quả được lưu ở `cv_documents.parsed_data.structured_profile` và `ai_tasks.output_json`. Hồ sơ cá nhân tiếp tục được chỉnh sửa qua các biểu mẫu hiện có. Mỗi mục AI trích xuất phải có bằng chứng là một đoạn có thật trong văn bản CV gốc. Nếu trích dẫn không khớp, tác vụ trả lỗi và loại bỏ kết quả.

Khi CV được trích xuất lại, dữ liệu phân tích lưu cùng CV được thay bằng metadata trích xuất mới. Lịch sử tác vụ AI vẫn giữ kết quả cũ và hiển thị cảnh báo phiên bản khi được mở lại.

### Đối chiếu kỹ năng bằng AI

Ứng viên mở trang **Đối chiếu kỹ năng CV**, chọn **Phân tích bằng AI**, chọn các tin hoặc nhóm tối đa 20 tin mới nhất rồi gửi. Giao diện xử lý lần lượt từng tin, hiển thị tiến độ và cho dừng các tin còn lại sau khi yêu cầu đang chạy hoàn tất. Nhóm dừng khi nhà cung cấp báo lỗi hoặc hết hạn mức, có thể xem các kết quả đã lưu trong lịch sử.

AI đọc bằng chứng cho từng kỹ năng được yêu cầu. Backend kiểm tra đủ và đúng danh sách mã kỹ năng, trích dẫn phải tồn tại nguyên văn trong CV. Sau đó hệ thống tính điểm kỹ năng theo trọng số, kỹ năng bắt buộc có trọng số gấp đôi. Kết quả Groq có mã `groq-skills-v1`, OpenAI có mã `openai-skills-v1`, được lưu vào `match_results` cùng tác vụ tương ứng.

Điểm phản ánh bằng chứng kỹ năng trong văn bản. Kinh nghiệm được trình bày trong kết quả phân tích CV để người đọc xem xét riêng. Điểm kinh nghiệm hiện để `null`. Tin yêu cầu kinh nghiệm có điểm tổng `null` và giao diện hiển thị chưa đủ cơ sở. Việc chuyển trạng thái tuyển dụng tiếp tục do nhà tuyển dụng thực hiện ở khối xét duyệt.

Mỗi POST đối chiếu AI nhận một `jobId`. Nhóm nhiều tin được frontend gửi thành các POST nối tiếp. Nếu một yêu cầu thất bại, nhóm dừng và tải lại lịch sử. Các kết quả đã lưu trước đó vẫn xem được. Có thể dùng chế độ **Quy tắc từ khóa** cho thuật toán `skill-overlap-v1` hiện có.

### Soạn JD

Nhà tuyển dụng tạo và lưu tin nháp, bổ sung thông tin và kỹ năng. Khi các thay đổi đã được lưu, dùng **AI hỗ trợ soạn tin tuyển dụng → Tạo bản nháp JD**. Có thể nhập yêu cầu biên tập bổ sung tối đa 2.000 ký tự.

Kết quả có mô tả, yêu cầu, quyền lợi và các ghi chú cần xác nhận. Chọn **Đưa bản nháp vào biểu mẫu**, xem lại nội dung và dùng nút lưu thông tin hiện có. Thao tác lưu dùng revision của tin như trước. Bản nháp AI từ revision khác được cảnh báo và yêu cầu tạo lại theo dữ liệu hiện tại trước khi đưa vào biểu mẫu.

### Câu hỏi phỏng vấn

Nhà tuyển dụng mở **Đơn ứng tuyển → Chi tiết → AI gợi ý câu hỏi phỏng vấn**. Chọn **Tạo bộ câu hỏi** để tạo 5–12 câu hỏi chuyên môn hoặc tình huống, mỗi câu có mục đích và gợi ý hỏi sâu.

Đầu vào dùng tin tuyển dụng tại thời điểm nộp, các mục hồ sơ đã gửi và văn bản CV đã nộp nếu có. Nếu CV lúc nộp chưa trích xuất, các mục hồ sơ đã gửi vẫn được dùng. Lịch sử nằm trong chi tiết đơn để xem lại trước buổi phỏng vấn.

## API

Các endpoint yêu cầu tài khoản hoạt động và Bearer token đúng vai trò.

| Phương thức | Endpoint | Nội dung |
|---|---|---|
| POST | `/api/candidate/cvs/:cvId/analyze` | Phân tích cấu trúc CV READY đang hoạt động |
| POST | `/api/candidate/cvs/:cvId/ai-matches` | Đối chiếu AI với body `{ "jobId": 1 }` |
| GET | `/api/candidate/cvs/:cvId/ai-tasks?feature=PARSE_CV` | Lịch sử phân tích CV |
| GET | `/api/candidate/cvs/:cvId/ai-tasks?feature=MATCH_CV` | Lịch sử đối chiếu, gồm trạng thái lỗi/đang chạy |
| POST | `/api/recruiter/jobs/:jobId/ai-description` | Soạn JD với body `{ "notes": "..." }` hoặc `{}` |
| GET | `/api/recruiter/jobs/:jobId/ai-tasks` | Lịch sử JD của tài khoản trên tin thuộc công ty |
| POST | `/api/recruiter/applications/:applicationId/interview-questions` | Tạo câu hỏi với body `{ "notes": "..." }` hoặc `{}` |
| GET | `/api/recruiter/applications/:applicationId/ai-tasks` | Lịch sử câu hỏi theo đơn thuộc công ty |

Các POST thành công trả `201` với `data`, `taskId` và `meta`. Metadata gồm provider, providerLabel, model, ID phản hồi, thông tin token do nhà cung cấp trả về, thời điểm tạo và phiên bản nguồn. Các endpoint lịch sử hỗ trợ `page` và `limit` từ 1 đến 100. Candidate task detail hiện có tiếp tục đọc được tác vụ mới.

## Lưu trữ và lỗi

Tác vụ chuyển từ `RUNNING` sang `SUCCEEDED` hoặc `FAILED`. Kết quả và trạng thái hoàn tất được lưu trong transaction. Khóa dữ liệu chỉ dùng cho các bước ghi ngắn, lời gọi HTTP nằm ngoài transaction khóa tài nguyên. Khi lưu phân tích CV hoặc kết quả đối chiếu, backend kiểm tra lại phiên bản, trạng thái và quyền truy cập hiện tại. CV thay đổi hoặc tin hết điều kiện nhận hồ sơ sẽ làm tác vụ lỗi thay vì lưu kết quả với phiên bản nguồn khác.

Mỗi tài khoản xử lý một tác vụ AI tại một thời điểm để tránh yêu cầu trùng đang chạy. Tác vụ RUNNING bị gián đoạn quá 210 giây được đánh dấu FAILED khi người dùng khởi tạo lần xử lý kế tiếp. Yêu cầu đầu vào JSON tối đa 180.000 ký tự ở lớp ứng dụng, còn nhà cung cấp áp dụng hạn mức token riêng. AI đối chiếu tối đa 100 kỹ năng cho một tin. Các giới hạn đầu ra theo schema và token được kiểm tra ở cả phía API và backend.

| Mã lỗi | Hướng xử lý |
|---|---|
| `AI_NOT_CONFIGURED` | Điền `GROQ_API_KEY` khi dùng Groq, khởi động lại backend |
| `AI_INVALID_CONFIGURATION` | Kiểm tra model, timeout và giới hạn token |
| `AI_AUTH_ERROR` | Kiểm tra khóa, project và quyền dùng model |
| `AI_RATE_LIMIT` | Chờ theo Retry-After nếu có và kiểm tra Limits của tài khoản API |
| `AI_TOKEN_LIMIT` | Rút gọn CV hoặc cân đối token đầu ra với giới hạn của nhà cung cấp |
| `AI_BUSY` | Chờ tác vụ hiện tại, tải lại lịch sử |
| `AI_TIMEOUT`, `AI_UNAVAILABLE` | Kiểm tra kết nối và lịch sử trước khi gửi lại |
| `AI_REFUSED`, `AI_INCOMPLETE` | Điều chỉnh đầu vào hoặc cấu hình giới hạn đầu ra |
| `AI_INVALID_OUTPUT`, `AI_UNGROUNDED_OUTPUT`, `AI_INVALID_SKILLS` | Kết quả đã bị loại, có thể điều chỉnh đầu vào và tạo lần mới |
| `AI_SOURCE_CHANGED`, `CV_NOT_PARSED` | Tải lại dữ liệu nguồn trước khi gửi yêu cầu mới |

Các đoạn CV/hồ sơ và yêu cầu tuyển dụng cần thiết được gửi đến nhà cung cấp đã cấu hình khi người dùng chọn thao tác AI. Ứng dụng giữ input snapshot và output trong database để gắn kết quả với phiên bản nguồn. Groq mô tả chính sách lưu dữ liệu và tùy chọn kiểm soát tại [Your Data](https://console.groq.com/docs/your-data). Với OpenAI, yêu cầu Responses API dùng `store: false`. Khi người dùng rời trang hoặc mất kết nối, backend có thể tiếp tục hoàn tất tác vụ đã nhận. Dùng lịch sử để lấy kết quả đó. Lời gọi API lỗi được ghi vào lịch sử để người dùng chủ động chọn gửi lại.

Bản tích hợp Groq đã được viết mã và đọc rà soát nguồn. Chưa chạy test, build, kiểm tra trình duyệt hoặc gọi dịch vụ bằng khóa thật theo yêu cầu kiểm thử của người dùng và tình trạng chưa có API key.

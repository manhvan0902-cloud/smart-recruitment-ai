# Smart Recruitment — Frontend

Frontend dùng React, JavaScript, Vite, React Router, Ant Design và Fetch API.

## Cài đặt và chạy

Yêu cầu Node.js từ 22.16 trở lên. Thực hiện trong thư mục `Frontend`.

```powershell
npm.cmd ci
npm.cmd run dev
```

Mở `http://localhost:5173`. Chạy backend ở một terminal khác theo README tại thư mục gốc. Vite chuyển tiếp `/api` đến `http://localhost:3000`.

Nếu cần đổi cấu hình, sao chép `.env.example` thành `.env`, sửa các giá trị rồi khởi động lại Vite.

| Biến | Mặc định | Công dụng |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Prefix API được frontend sử dụng |
| `API_PROXY_TARGET` | `http://localhost:3000` | Địa chỉ backend cho proxy phát triển của Vite |

Khi triển khai frontend trên hosting, cấu hình chuyển tiếp `/api` đến backend hoặc đặt `VITE_API_BASE_URL` thành URL API và cấu hình `CLIENT_ORIGIN` phù hợp ở backend. Hosting dùng BrowserRouter cần đưa các đường dẫn trang về `index.html`.

## Phạm vi giai đoạn 2

- Đăng ký ứng viên hoặc nhà tuyển dụng.
- Đăng nhập, đăng xuất phía frontend và đổi mật khẩu.
- Lưu phiên trong `sessionStorage`, duy trì phiên khi tải lại trang trong cùng tab.
- Xác nhận phiên và vai trò với backend khi mở ứng dụng hoặc đăng nhập.
- Xử lý token hết hạn, tài khoản bị khóa và quyền truy cập thay đổi khi backend từ chối phiên.
- Bố cục ứng viên với menu trên cùng, nhà tuyển dụng/admin với sidebar, menu thu gọn trên điện thoại.
- Trang 403, trang không tìm thấy và các khung trang nghiệp vụ cho các giai đoạn tiếp theo.

## Phạm vi giai đoạn 3

- Trang `/recruiter/profile` để xem, tạo và cập nhật hồ sơ công ty, chọn ngành nghề/địa điểm từ danh mục.
- Upload, thay và gỡ logo JPEG, PNG hoặc WebP tối đa 5 MB. Chức năng logo cần cấu hình Cloudinary ở backend.
- Hiển thị trạng thái xác minh, ghi chú của admin và cảnh báo khi đổi tên công ty làm hồ sơ trở về chờ xác minh.
- Trang `/admin/companies` có phân trang, lọc trạng thái, xem chi tiết và xác minh hoặc từ chối công ty. Mặc định mở danh sách chờ xác minh. Từ chối yêu cầu nhập lý do.
- Trang `/admin/users` có phân trang, tìm email, lọc vai trò, khóa/mở khóa tài khoản bằng hộp thoại xác nhận. Tài khoản admin đang đăng nhập được nhận diện và khóa thao tác tự thay đổi trạng thái.
- Các danh sách có trạng thái tải, lỗi, dữ liệu trống và thao tác thử lại. Yêu cầu danh sách cũ được hủy khi đổi bộ lọc hoặc rời trang.

API danh sách công ty phía admin được bổ sung thông tin `industry` và `location` để hiển thị tên ngành nghề và địa điểm trong hồ sơ.

## Phạm vi giai đoạn 4

- Nhà tuyển dụng có danh sách tin phân trang, lọc trạng thái, tạo nháp, sửa tin, lưu kỹ năng, đăng và đóng tin.
- Biểu mẫu tin có mô tả, yêu cầu, quyền lợi, ngành nghề, địa điểm, cấp bậc, loại việc, hình thức làm việc, lương, kinh nghiệm, học vấn, số lượng và hạn nộp.
- Phần kỹ năng cho phép thêm/bỏ, đánh dấu bắt buộc và đặt mức quan trọng 1–5.
- Sửa tin và lưu kỹ năng dùng revision hiện tại. Khi có xung đột, giao diện giữ nội dung đang nhập và cho phép tải bản mới.
- Phản hồi 422 có dữ liệu đã lưu được cập nhật vào giao diện cùng revision, trạng thái và danh sách điều kiện cần bổ sung.
- Hạn nộp nhập theo giờ Việt Nam và được gửi dưới dạng ISO 8601 có múi giờ.
- Ứng viên có tìm kiếm từ khóa, lọc ngành nghề/địa điểm/cấp bậc/loại việc/hình thức làm việc và phân trang. Bộ lọc nằm trên URL để mở lại danh sách khi quay về từ chi tiết tin.
- Trang chi tiết việc làm hiển thị nội dung, yêu cầu, quyền lợi, kỹ năng và thông tin công ty.
- Lưu/bỏ lưu hoạt động ở danh sách và chi tiết. Trang việc đã lưu hiển thị trạng thái ngừng nhận hồ sơ khi tin không còn đủ điều kiện nhận đơn.
- Trên màn hình nhỏ, bộ lọc mở trong bảng bên cạnh và các khối nội dung chuyển về một cột.

API ứng viên được bổ sung `is_saved` ở danh sách/chi tiết việc làm. API việc đã lưu bổ sung tên địa điểm và `is_available` dựa trên trạng thái tin, hạn nộp, xác minh công ty và trạng thái tài khoản. Khởi động lại backend nếu tiến trình đang chạy chưa tự nạp các thay đổi controller.

## Phạm vi giai đoạn 5

- Trang hồ sơ ứng viên có thông tin cá nhân, mong muốn công việc và các tab học vấn, kinh nghiệm, dự án, chứng chỉ, kỹ năng.
- Các mục hồ sơ có thêm, sửa, xóa, xem chi tiết và phân trang. Biểu mẫu kiểm tra ngày hợp lệ, thứ tự ngày, độ dài nội dung và liên kết HTTP/HTTPS.
- Kỹ năng cá nhân có mức độ và bằng chứng, được lưu bằng thao tác thay danh sách kỹ năng của API.
- Tài khoản cũ chưa có hồ sơ có thể tạo hồ sơ ở tab thông tin chung.
- CV có tải lên PDF tối đa 10 MB, danh sách phân trang, chi tiết, tải xuống và lưu trữ. Chức năng tệp cần cấu hình Cloudinary tại backend.
- Trang chi tiết việc làm có nút ứng tuyển. Hộp thoại cho chọn CV đang hoạt động, chuyển trang trong danh sách CV và nhập thư giới thiệu.
- CV đã tải lên có thể dùng để ứng tuyển ngay. Lỗi gửi đơn giữ lại nội dung biểu mẫu. Tin đã có đơn hiển thị liên kết xem đơn đã nộp, kể cả khi đơn đã rút.
- Ứng viên có danh sách đơn, trang xem hồ sơ tại thời điểm gửi và rút đơn SUBMITTED hoặc REVIEWING bằng hộp thoại xác nhận.
- Nhà tuyển dụng có danh sách đơn, lọc trạng thái/theo tin, xem hồ sơ đã nộp và tải CV. Trang tin tuyển dụng có liên kết **Xem đơn**.
- Chi tiết đơn dùng các snapshot do backend trả về. Các đơn tạo từ giai đoạn này lưu thêm tên danh mục và kỹ năng để giữ nội dung khi danh mục được cập nhật. Đơn cũ thiếu các tên này hiển thị dữ liệu có sẵn, tên kỹ năng cũ có thể xuất hiện bằng mã kỹ năng.

Backend được bổ sung tên danh mục trong phản hồi hồ sơ ứng viên, thông tin đơn đã nộp trong chi tiết việc làm và tên danh mục/kỹ năng trong snapshot của các đơn mới. Khởi động lại backend nếu tiến trình đang chạy chưa tự nạp thay đổi.

Thao tác xét duyệt, ghi chú xét tuyển và lịch phỏng vấn được triển khai ở giai đoạn 6. Giai đoạn 7 bổ sung trích xuất/đối chiếu CV và thông báo.

## Mở các màn hình giai đoạn 3

Đăng nhập tài khoản nhà tuyển dụng, chọn **Hồ sơ công ty** trong menu bên trái. Tài khoản cũ chưa có hồ sơ có thể tạo hồ sơ bằng biểu mẫu ở cùng trang. Sau khi admin thay đổi kết quả xác minh, dùng **Tải lại hồ sơ** để cập nhật thông tin.

Đăng nhập tài khoản admin, chọn **Xác minh công ty**, sau đó mở **Xem hồ sơ** để xem thông tin và cập nhật kết quả. Chọn **Tài khoản** để tìm kiếm và quản lý trạng thái tài khoản.

## Phạm vi giai đoạn 6

- Nhà tuyển dụng xét duyệt đơn theo các bước hợp lệ, cập nhật ghi chú nội bộ và xác nhận trước khi chuyển trạng thái.
- Tạo lịch từ chi tiết đơn đang xem xét hoặc phỏng vấn. Tạo lịch thành công tự chuyển đơn đang xem xét sang phỏng vấn theo backend.
- Lịch có tên, giờ bắt đầu/kết thúc, hình thức trực tuyến/trực tiếp, liên kết họp HTTPS hoặc địa điểm và nội dung lời mời.
- Thời gian nhập và hiển thị theo Việt Nam (UTC+7). Lịch mới lưu `Asia/Ho_Chi_Minh`; sửa lịch giữ múi giờ đã lưu và giữ độ chính xác thời gian nếu không đổi trường ngày giờ.
- Trang lịch riêng cho mỗi vai trò có phân trang, lọc trạng thái và lọc theo `applicationId` trên URL. Nhà tuyển dụng xem tên/email ứng viên; ứng viên xem tên công ty.
- Ứng viên chấp nhận/từ chối một lần khi lịch chưa bắt đầu, đang chờ phản hồi và đơn ở vòng phỏng vấn. Thay đổi thời gian, hình thức, liên kết hoặc địa điểm yêu cầu phản hồi lại.
- Nhà tuyển dụng sửa, hủy và hoàn tất lịch theo điều kiện backend. Hoàn tất yêu cầu ứng viên đã chấp nhận, lịch đã kết thúc và đơn ở vòng phỏng vấn.
- Đề nghị làm việc yêu cầu có lịch hoàn tất; đã tuyển chỉ chuyển từ đề nghị làm việc. Từ chối/đã tuyển tự hủy các lịch chưa bắt đầu.
- Ghi chú chỉ hiển thị phía công ty. Các thay đổi từ người tham gia khác được lấy bằng nút tải lại, chưa cập nhật theo thời gian thực.

API ứng viên bổ sung bộ lọc `status`, `applicationId` và tên công ty cho danh sách lịch. API danh sách lịch nhà tuyển dụng bổ sung tên/email từ hồ sơ đã nộp; chi tiết đơn bổ sung `completed_interview_count`. Cần khởi động lại backend nếu tiến trình chưa tự nạp controller mới. Không thay đổi cấu trúc database.

## Mở các màn hình giai đoạn 4

Nhà tuyển dụng chọn **Tin tuyển dụng → Tạo tin**, nhập thông tin và **Lưu tin nháp**. Trên trang chi tiết, thêm kỹ năng và **Lưu kỹ năng**. Khi thông tin và kỹ năng đã lưu, công ty đã được xác minh, dùng **Đăng tin**. Các trường còn thiếu được hiển thị khi backend trả kết quả kiểm tra điều kiện đăng tin. Thao tác **Đóng tin** có bước xác nhận.

Thông tin tin tuyển dụng và danh sách kỹ năng dùng hai thao tác lưu riêng theo API hiện tại. Giao diện yêu cầu lưu các thay đổi trước khi đăng hoặc đóng tin.

Ứng viên chọn **Tìm việc**, tìm theo từ khóa hoặc dùng bộ lọc, mở tiêu đề để xem chi tiết. Dùng **Lưu việc** hoặc **Bỏ lưu** để cập nhật danh sách. Trang **Việc đã lưu** cho phép xem lại các tin còn nhận hồ sơ và bỏ lưu cả tin đã ngừng nhận hồ sơ.

## Mở các màn hình giai đoạn 5

Ứng viên mở menu tài khoản → **Hồ sơ cá nhân** để cập nhật thông tin và các tab hồ sơ. Mỗi tab có thao tác lưu riêng. Chọn **CV của tôi → Tải CV lên**, chọn PDF và đặt tên CV.

Từ **Tìm việc**, mở một tin đang nhận hồ sơ → **Ứng tuyển**, chọn CV và nhập thư giới thiệu nếu cần, sau đó **Gửi hồ sơ**. Thành công chuyển tới chi tiết đơn. Trang **Đơn ứng tuyển** cho phép xem lại thông tin và rút đơn khi còn đủ điều kiện. Mỗi ứng viên chỉ nộp một lần cho một tin, kể cả sau khi rút đơn.

**Lưu trữ CV** gỡ CV khỏi danh sách chọn cho đơn mới. Các đơn đã gửi giữ bản chụp CV đã nộp và nhà tuyển dụng vẫn có thể tải tệp qua đơn ứng tuyển. Thao tác tải CV của ứng viên áp dụng cho CV đang hoạt động theo API hiện tại.

Nhà tuyển dụng mở **Đơn ứng tuyển** hoặc **Tin tuyển dụng → Xem đơn**, chọn **Chi tiết** để đọc hồ sơ, thư giới thiệu, tin tuyển dụng tại thời điểm nộp và tải CV.

## Mở các màn hình giai đoạn 6

Nhà tuyển dụng mở **Đơn ứng tuyển → Chi tiết → Xét duyệt hồ sơ**, chọn **Đang xem xét** và lưu. Tại **Lịch phỏng vấn → Tạo lịch**, điền thời gian ở tương lai và gửi lời mời. Có thể nhập ghi chú nội bộ và lưu riêng mà không đổi trạng thái.

Ứng viên mở **Lịch phỏng vấn** hoặc chi tiết đơn, xem lời mời rồi **Chấp nhận** hoặc **Từ chối**. Nhà tuyển dụng bấm **Tải lại lịch** để lấy phản hồi. Khi ứng viên đã chấp nhận và đến giờ kết thúc, chọn **Hoàn tất phỏng vấn**, sau đó chuyển hồ sơ sang **Đề nghị làm việc**, rồi **Đã tuyển** nếu phù hợp. Các bước xét duyệt có xác nhận trước khi gửi.

Nếu lịch được sửa thời gian, hình thức, liên kết hoặc địa điểm, ứng viên cần mở lại lịch và phản hồi lại. Chỉnh tên hoặc nội dung lời mời giữ phản hồi hiện tại. Nếu có lỗi khi lưu, biểu mẫu giữ nội dung; tải lại dữ liệu khi backend báo trạng thái đã thay đổi.

## Phạm vi và cách dùng giai đoạn 7

- Ứng viên mở **CV của tôi → Trích xuất / Chi tiết → Trích xuất văn bản**. Chức năng đọc lớp văn bản PDF, tối đa 100 trang; không nhận dạng chữ từ ảnh và chưa phân tích bằng mô hình AI. Kho tệp cần cấu hình Cloudinary ở backend.
- Trích xuất lại CV READY có xác nhận. Thành công tăng phiên bản văn bản. Khi thất bại, giao diện giữ thông báo lỗi và cho phép thử lại; PDF chỉ chứa ảnh có hướng dẫn dùng PDF có lớp văn bản.
- Yêu cầu trích xuất hiện chạy đồng bộ. Giao diện thể hiện đang xử lý trong lúc gửi; không tự gửi lại POST. Nếu CV đang PROCESSING/QUEUED khi mở trang hoặc sau lỗi kết nối, trang đọc lại trạng thái mỗi 3 giây sau khi lần đọc trước kết thúc, tối đa 20 lần. Sau đó dùng **Tải lại** để kiểm tra tiếp. Lỗi đọc trạng thái dừng việc đọc tự động.
- Mở **Đối chiếu kỹ năng / Xem kết quả**, chọn tối đa 20 tin qua nhiều trang hoặc chọn nhóm tối đa 20 tin mới nhất đang nhận hồ sơ. Chọn **Đối chiếu kỹ năng** để tạo kết quả; mỗi lần gửi có thể tạo thêm bản ghi lịch sử.
- Từ trang chi tiết việc làm, nút **Đối chiếu CV** cho chọn CV READY và mở trang đối chiếu với tin đó đã chọn sẵn. Nếu CV/tin thay đổi trước khi gửi, backend vẫn kiểm tra điều kiện hiện tại.
- Lịch sử phân trang hiển thị điểm kỹ năng, điểm tổng tham khảo, kỹ năng tìm thấy/chưa tìm thấy, bằng chứng trích từ CV, gợi ý và phiên bản dữ liệu. **Thông tin xử lý** đọc trạng thái tác vụ của lần đối chiếu đó.
- Phương pháp `skill-overlap-v1` so tên kỹ năng và alias trong văn bản CV, có trọng số. Chưa suy luận kinh nghiệm; điểm tổng thiếu cơ sở hiển thị **Chưa đủ cơ sở**, điểm 0 vẫn hiển thị 0%. Kết quả cũ được cảnh báo khi phiên bản văn bản CV hoặc revision tin khác hiện tại. Kết quả chỉ tham khảo, không phải kết luận tuyển dụng.
- CV đã lưu trữ vẫn xem được lịch sử đối chiếu; không tạo đối chiếu mới hoặc trích xuất lại từ CV đã lưu trữ.
- Ứng viên/nhà tuyển dụng có trang **Thông báo** với danh sách phân trang, lọc chưa đọc, đánh dấu một/tất cả đã đọc và mở nội dung liên quan. Mở nội dung đánh dấu đã đọc trước khi điều hướng; nếu lưu lỗi, trang giữ thông báo lỗi để thử lại.
- Chuông trên thanh đầu trang hiển thị số chưa đọc. Số này được lấy lại khi quay lại cửa sổ, khi tab hiện lại, mỗi 60 giây khi tab đang hiển thị và sau thao tác đọc. Danh sách thông báo dùng nút **Tải lại** để lấy nội dung mới, chưa dùng kết nối thời gian thực.
- Đường dẫn thông báo cũ như `/applications/:id`, `/company/profile` được ánh xạ về trang theo vai trò. Chỉ mở các đích nội bộ đã biết; đường dẫn không nhận diện được vẫn cho đọc nội dung và đánh dấu đã đọc.

API thông báo của cả hai vai trò bổ sung `unread=true` để lọc thông báo chưa đọc. Cần khởi động lại backend nếu tiến trình chưa nạp controller mới. Không thêm dependency hoặc thay đổi cấu trúc database.

Giai đoạn 7 dừng sau khi viết mã và cập nhật tài liệu. Giai đoạn 8 còn phần hoàn thiện, chuẩn bị demo; chỉ kiểm thử khi có yêu cầu **“test giúp tôi”**.

## Phiên đăng nhập

Backend dùng JWT qua header `Authorization`. Phiên frontend gồm token và thông tin tài khoản do API đăng nhập trả về. Frontend đọc hạn dùng để cập nhật giao diện, backend xác minh token và phân quyền từng yêu cầu.

Backend hiện chưa có route tài khoản hiện tại. Frontend xác nhận phiên bằng API danh mục theo vai trò ứng viên/công ty và API danh sách tài khoản cho admin. Lỗi kết nối cho phép thử lại xác nhận phiên. Đăng xuất xóa phiên trong tab hiện tại. Đổi mật khẩu thành công đưa người dùng về đăng nhập.

Nếu trình duyệt chặn `sessionStorage`, phiên được giữ trong bộ nhớ trong lần mở trang hiện tại.

## Cấu trúc

```text
src/
  components/    Thành phần dùng chung
  config/        Vai trò, menu và trang mặc định
  contexts/      Phiên đăng nhập
  layouts/       Bố cục tài khoản và khu vực làm việc
  pages/         Trang tài khoản, lỗi và khung trang nghiệp vụ
  routes/        Kiểm tra đăng nhập và vai trò
  services/      Gọi API và các chức năng xác thực
  utils/         Phiên trình duyệt và quy tắc biểu mẫu
  App.jsx        Khai báo đường dẫn
  main.jsx       Khởi tạo React và cấu hình Ant Design
  styles.css     Giao diện dùng chung và responsive
```

## Trạng thái kiểm thử

Giai đoạn 2 đến 7 chưa chạy kiểm thử, build hoặc kiểm tra giao diện bằng trình duyệt. Theo yêu cầu của người dùng, thực hiện khi có chỉ dẫn “test giúp tôi”.

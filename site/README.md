# Chữ không dấu Studio

Trang độc lập, HTML/CSS/JavaScript, không cần build. Mở `index.html` hoặc phục vụ thư mục `site/` bằng máy chủ tĩnh. Giao diện không thay thế playground Python hiện có.

- Hai ô chỉnh sửa, đồng bộ hai chiều, nút sao chép riêng, Ctrl+Enter để thêm dấu.
- ASCII: NFKD, bỏ combining marks, đ/Đ -> d/D, chuẩn hóa dấu câu; chỉ giữ U+0020–007E, LF và TAB. Emoji, ký tự điều khiển, zero-width và các chữ ngoài ASCII bị loại. Đây là chuyển đổi có mất dữ liệu.
- Khôi phục cục bộ dùng bảng từ nom-vn và một số cụm từ bổ sung; KHÔNG phải mô hình AI hay khôi phục chính xác tuyệt đối. Từ lạ giữ nguyên; cần biên tập tên riêng và từ đa nghĩa.
- AI tùy chọn: người dùng cung cấp URL máy chủ nom-vn đang chạy với backend HF. Chỉ nút Thêm dấu gửi POST `/api/tools/diacritic/restore` với `{text, backend:"hf"}`. Máy chủ phải cho phép CORS. Không có máy chủ AI công cộng đi kèm.
- Kết quả AI phải giữ nguyên chuỗi ASCII đầu vào; nếu mô hình sửa chữ/khoảng trắng thì giao diện từ chối áp dụng.
- Không localStorage, sessionStorage, cookie, phân tích hành vi hay lịch sử văn bản. Làm lại hủy request, xóa hai ô và URL API. Không thể thu hồi clipboard hoặc dữ liệu đã gửi tới API bên ngoài.

## Kiểm thử

`node site/test.cjs` từ thư mục gốc repo. Kiểm tra toàn bộ BMP, ASCII idempotence, Unicode tổ hợp, hoa/thường, khoảng trắng, gợi ý dấu.

Đã kiểm tra trình duyệt: gợi ý dấu, chuyển ngược có emoji và dấu ngoặc cong, sao chép clipboard, làm lại. Chưa kiểm thử mô hình HF thực tế vì không có máy chủ API được cấu hình.

## GitHub Pages

Workflow `chukhongdau-pages.yml` triển khai riêng thư mục site. Bật Settings → Pages → Source: GitHub Actions rồi chạy workflow. Giữ nguyên các thư mục và workflow hiện có của upstream.

## Bản quyền

Kế thừa bảng từ `src/nom/text/normalize.py` của nrl-ai/nom-vn, Apache-2.0. Phần giao diện và bổ sung: Long Ngo. Xem LICENSE của repo.

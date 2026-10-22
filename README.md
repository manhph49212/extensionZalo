# 🤖 Zalo AI Reader & Summarizer

> **Công cụ đọc và tóm tắt tin nhắn nhóm Zalo theo yêu cầu bằng Trí Tuệ Nhân Tạo (AI)**  
> Hoạt động trực tiếp trên **Zalo Web (chat.zalo.me)** dưới dạng Chrome Extension (Manifest V3).

---

## 🌟 Tính Năng Nổi Bật

1. **Đúng yêu cầu & Tôn trọng quyền riêng tư ("chỉ đọc khi người dùng bấm Đọc")**:
   - Tool **KHÔNG** tự động đọc lén hay gửi tin nhắn ngầm.
   - Chỉ khi bạn vào nhóm chat cụ thể và bấm nút **"📥 Đọc tin nhắn nhóm này"**, tool mới quét các tin nhắn đang hiển thị hoặc cuộn tải 50-100 tin gần nhất.
2. **Prompt linh hoạt theo ý muốn**:
   - Có ô nhập yêu cầu tùy ý (Prompt).
   - Bạn nhập: *"Tóm tắt nội dung"* ➔ AI sẽ tóm tắt cuộc họp/thảo luận.
   - Bạn nhập: *"Liệt kê ai cần làm việc gì và hạn chót"* ➔ AI trích xuất bảng việc cần làm (To-Do list).
   - Bạn nhập: *"Tìm số điện thoại và số tài khoản ngân hàng"* ➔ AI tự lọc dữ liệu liên hệ.
   - Bạn có thể hỏi bất kỳ câu hỏi nào về nội dung trao đổi của nhóm.
3. **Các nút Prompt nhanh 1-Click**:
   - 📝 Tóm tắt nội dung chính
   - 📋 Danh sách việc cần làm (To-Do & Deadline)
   - 💡 Quyết định & kết luận quan trọng
   - 📞 Lọc SĐT / Link / STK
4. **Hỗ trợ AI miễn phí & mạnh mẽ**:
   - Mặc định tích hợp **Google Gemini** (Gemini 2.5 Flash / 1.5 Flash) hoàn toàn miễn phí từ Google AI Studio, cực kỳ thông minh và hiểu tiếng Việt rất tốt.
   - Hỗ trợ thêm OpenAI (ChatGPT) hoặc DeepSeek/Ollama tùy chọn.
5. **Tiện ích xuất kết quả**:
   - Sao chép 1-click vào Clipboard.
   - Tải file text `.txt` báo cáo về máy tính.

---

## 🚀 Hướng Dẫn Cài Đặt (Chỉ 30 Giây)

Thư mục tiện ích nằm tại:  
📂 `c:\laragon\www\doctinnhanazlo\extension`

### Các bước cài đặt:
1. Mở trình duyệt (Chrome, Cốc Cốc, Edge, Brave).
2. Truy cập vào trang quản lý tiện ích:
   - Trên Google Chrome / Brave: `chrome://extensions/`
   - Trên Cốc Cốc: `coccoc://extensions/`
   - Trên Microsoft Edge: `edge://extensions/`
3. Bật công tắc **"Chế độ cho nhà phát triển" (Developer mode)** ở góc trên bên phải.
4. Bấm nút **"Tải tiện ích đã giải nén" (Load unpacked)** ở góc trên bên trái.
5. Chọn thư mục: `c:\laragon\www\doctinnhanazlo\extension`
6. Xong! Biểu tượng **Zalo AI Reader** sẽ xuất hiện trên thanh công cụ của trình duyệt.

---

## 🔑 Hướng Dẫn Lấy Google Gemini API Key Miễn Phí (1 Phút)

1. Truy cập: [Google AI Studio (https://aistudio.google.com/app/apikey)](https://aistudio.google.com/app/apikey)
2. Đăng nhập bằng tài khoản Google của bạn.
3. Bấm **"Create API key"** (Tạo khóa API).
4. Sao chép chuỗi mã API Key.
5. Bấm vào icon tiện ích Zalo AI Reader trên trình duyệt hoặc biểu tượng bánh răng ⚙️ trong widget Zalo để dán và Lưu khóa.

---

## 📖 Cách Sử Dụng Trên Zalo Web

1. Đăng nhập vào [chat.zalo.me](https://chat.zalo.me/).
2. Bạn sẽ thấy một nút tròn nổi màu xanh tím: **"🤖 AI Đọc Tin"** ở góc dưới bên phải màn hình.
3. **Bấm vào bất kỳ nhóm chat** bạn muốn đọc tin nhắn.
4. Bấm mở nút **"AI Đọc Tin"**:
   - **Bước 1**: Bấm nút **"📥 Đọc tin nhắn nhóm này"**.
   - **Bước 2**: Nhập yêu cầu vào ô (ví dụ: *tóm tắt nội dung*) hoặc bấm các thẻ gợi ý có sẵn.
   - **Bước 3**: Bấm nút **"✨ Gửi AI Xử Lý Tin Nhắn"**.
5. AI sẽ đọc toàn bộ tin nhắn đã quét và trả lời cho bạn ngay lập tức! Bạn có thể bấm **Copy** hoặc **Tải về**.

---

## 💻 Xem Trang Quản Trị / Thử Nghiệm

Nếu đang bật Laragon, bạn có thể mở trình duyệt và vào:
- `http://localhost/doctinnhanazlo` hoặc mở trực tiếp file `c:\laragon\www\doctinnhanazlo\index.html`
- Trang web có sẵn bộ giả lập trực quan và hướng dẫn chi tiết từng bước.

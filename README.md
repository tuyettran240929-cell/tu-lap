# Tự Lập · Học tập giảm dần AI

Web app học tập 3 giai đoạn cho mỗi chương: **Học** (AI không giới hạn) → **Luyện tập** (lượt AI giảm dần 5→1 theo chương) → **Kiểm tra** (tắt AI, hẹn giờ, đề biến thể, ghi nhận liêm chính).

## Chạy thử
- Mở trực tiếp `dist/tulap.html` (một file, không cần cài đặt), hoặc
- `python3 -m http.server 8080` rồi vào http://localhost:8080

Dữ liệu lưu trong `localStorage` của trình duyệt (key `tulap.v1`).

## Cấu trúc
- `index.html`, `css/`, `fonts/` (Be Vietnam Pro)
- `js/data.js` khoá mẫu "Thống kê mô tả cơ bản" + bộ sinh câu hỏi biến thể
- `js/store.js` trạng thái, ngưỡng, lượt AI · `js/ai.js` gia sư offline / OpenAI (tuỳ chọn)
- `js/importer.js` đọc TXT/MD/DOCX/PPTX/PDF, câu hỏi CSV/JSON, sinh câu hỏi cần duyệt
- `js/views/` các màn hình · `js/app.js` router

## Tạo bản một file
`python3 scripts/build_single.py` → `dist/tulap.html`

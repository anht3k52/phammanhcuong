# Referrer-Policy & Privacy Demo (React + Node.js + MongoDB)

Minh họa rò rỉ tham số nhạy cảm qua HTTP Referer và cách khắc phục với `Referrer-Policy: no-referrer`.

## Kiến trúc
- Frontend: React (Vite) – UI bật/tắt Fix mode, thao tác kịch bản token và q, hiển thị “Attacker Console”.
- Backend: Express (cổng 3001) – API, phục vụ bản build, set header Referrer-Policy khi Fix ON.
- Attacker: Express (cổng 4000) – thu thập Referer khi ảnh 1x1 tải hoặc user click outbound link; ghi Mongo.
- MongoDB: lưu log request (collection `requestlogs`).

Sơ đồ luồng: trang có `?token=...` hoặc `?q=...` → tải ảnh/link sang attacker → trình duyệt gửi Referer → attacker ghi log → UI hiển thị.

## Yêu cầu
- Node.js 18+, NPM 9+
- MongoDB cục bộ (27017) hoặc Docker Desktop

## Khởi chạy nhanh (Dev)
1) MongoDB (chọn 1)
   - Docker: `docker compose up -d`
   - Hoặc Mongo cục bộ mặc định 27017

2) Backend + Attacker
```
cd backend
npm ci
copy .env.example .env   # PowerShell
# (tuỳ chọn) sửa FIX_ACTIVE=true trong .env để bật fix khi chạy production
npm run dev
```

3) Frontend (Vite)
```
cd frontend
npm ci
npm run dev
```

4) Mở UI: http://localhost:5173

Ghi chú dev:
- Dev server của Vite phục vụ document, nên header Referrer-Policy từ backend không áp dụng cho document này.
- Để minh họa leak rõ ràng, khi Fix OFF UI dùng `referrerPolicy="unsafe-url"` cho ảnh/link ra ngoài nhằm ép trình duyệt gửi full Referer (bao gồm query). Khi Fix ON dùng `no-referrer`/`noreferrer` để ẩn Referer.

## Production build (để thấy header backend áp dụng cho document)
```
# Build frontend
cd frontend
npm run build

# Start backend phục vụ dist/ và set header khi FIX_ACTIVE=true
cd ../backend
$env:FIX_ACTIVE="true"   # PowerShell; cmd: set FIX_ACTIVE=true
npm start

# Mở http://localhost:3001
```

## Cách dùng demo
Trước tiên tắt Fix mode (OFF) để quan sát leak, sau đó bật lại (ON) để thấy đã chặn.

1) Magic link / reset token
   - Nhập token → bấm “Đưa token vào URL” → ảnh 1x1 tự reload → xem “Attacker Console”, Referer chứa `?token=...`.
   - Click “Mở attacker (có thể leak)” để tạo thêm log từ chuyển trang.

2) Tìm kiếm với q nhạy cảm
   - Nhập q → bấm “Đưa q vào URL” (tự xóa `token` khỏi URL để không trộn kịch bản) → ảnh 1x1 tự reload → “Attacker Console” thấy `?q=...`.
   - Click “Xem thêm (có thể leak)” để tạo thêm log từ outbound link.

Khi bật Fix mode (ON): ảnh dùng `referrerPolicy="no-referrer"` và link dùng `rel="noreferrer"` → Referer rỗng (không leak).

## API
- `GET /api/policy` → `{ fixActive: boolean }`
- `POST /api/policy` body `{ fixActive: boolean }`
- `GET /api/logs` → `{ items: RequestLog[] }`
- Attacker:
  - `GET http://localhost:4000/collect.gif` → log và trả ảnh 1x1
  - `GET http://localhost:4000/landing` → log và trả HTML đơn giản

## Mô hình dữ liệu
Collection `requestlogs`:
```
{
  url: string,
  method: string,
  headers: object,
  referer: string,
  ip: string,
  policySnapshot: string, // ví dụ: "fixActive=true|false"
  createdAt, updatedAt
}
```

## Troubleshooting
- Chỉ thấy `http://localhost:5173` (origin) mà không thấy query?
  - Trình duyệt mặc định `strict-origin-when-cross-origin` → chỉ gửi origin. Ở chế độ vulnerable, UI đã ép `referrerPolicy="unsafe-url"` để gửi full URL; đảm bảo Fix đang OFF.
- Logs chưa hiện ngay sau thao tác?
  - Nút “Đưa token/q vào URL” đã buộc ảnh 1x1 reload và auto-refresh bảng log. Với link outbound, bảng log tự refresh sau ~0.8s.
- `npm ci` trên Windows báo EPERM unlink (file đang bị khóa):
  - Đóng mọi dev server/IDE đang giữ `node_modules`, tắt tạm antivirus, rồi chạy lại `npm ci`.
- Port xung đột: sửa `.env` ở backend (`PORT`, `ATTACKER_PORT`) hoặc đổi cổng Vite trong `frontend/vite.config.js`.

## Ghi chú bảo mật
- Tránh nhét token/PII vào URL. Ưu tiên POST body, cookie httpOnly, hoặc fragment `#token` (fragment không xuất hiện trong Referer).
- Kiểm tra script/iframe bên thứ ba (analytics, ads, chat) vì có thể kích hoạt outbound request.
- Production: cấu hình `Referrer-Policy: no-referrer` (hoặc policy phù hợp) ở server/CDN/reverse proxy.

## License
MIT
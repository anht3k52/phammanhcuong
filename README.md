# Referrer Policy & Privacy – Demo (React + Node.js + MongoDB)

Demo tái hiện việc rò rỉ query params nhạy cảm qua HTTP Referer, và cách khắc phục bằng header `Referrer-Policy: no-referrer`.

## Kiến trúc
- Frontend: React (Vite)
- Backend: Node.js + Express
- MongoDB: lưu log request nhận được tại “attacker server”
- Attacker server: Express chạy cổng riêng (4000) để thu thập Referer từ trình duyệt khi tải ảnh/đi link ra ngoài

Luồng leak:
1) Trang React gắn dữ liệu nhạy cảm vào URL (ví dụ `?token=abc123` hoặc `?q=benh_nhay_cam`).
2) Trang tải tài nguyên ngoài domain (ảnh 1x1 hoặc người dùng click outbound link) → trình duyệt gửi header `Referer` đến domain kia, có thể chứa full URL.
3) Attacker server ghi lại `Referer` vào Mongo và hiển thị trong “Attacker Console”.

Khắc phục:
- Bật header `Referrer-Policy: no-referrer` cho tài liệu (document) và/hoặc dùng `rel="noreferrer"`, `referrerpolicy="no-referrer"` trên từng thẻ.
- Trong bản build production: backend sẽ set header này tự động khi bật “Fix mode”.

## Thư mục
```
backend/   # Express API, attacker server, Mongo models
frontend/  # Vite React UI (Leak/Fix playground + Attacker Console)
docker-compose.yml # MongoDB nhanh qua Docker
```

## Yêu cầu
- Node.js 18+
- NPM 9+
- MongoDB cục bộ hoặc Docker Desktop (dùng compose)

## Cách chạy (Dev)
1) Khởi động Mongo (chọn 1):
   - Docker: `docker compose up -d`
   - Hoặc tự cài Mongo và chạy mặc định cổng 27017

2) Backend (cổng 3001) và Attacker (cổng 4000):
```
cd backend
npm install
npm ci
cp .env.example .env   # tuỳ chọn; sửa FIX_ACTIVE=true để bật fix ngay từ đầu
npm run dev
```

3) Frontend (Vite dev server, cổng 5173):
```
cd frontend
npm install
npm ci
npm run dev
```

4) Mở UI: http://localhost:5173

Lưu ý: Trong chế độ dev, trang index.html do Vite phục vụ, nên header `Referrer-Policy` từ backend không áp dụng cho document này. Ta vẫn có thể demo leak/fix nhờ các thuộc tính `rel="noreferrer"` và `referrerpolicy="no-referrer"` được bật/tắt trong UI.

## Chạy Production build (để thấy header được backend set)
```
# Build frontend
cd frontend
npm run build

# Chạy backend (phục vụ static dist/ và set header khi FIX_ACTIVE=true)
cd ../backend
set FIX_ACTIVE=true  # Windows PowerShell: $env:FIX_ACTIVE="true"
npm start

# Mở: http://localhost:3001
```
Khi đó, document được trả từ backend sẽ có `Referrer-Policy: no-referrer` nếu bật fix.

## Tính năng UI
- Nút bật/tắt Fix mode: bật thì:
  - Backend set `Referrer-Policy: no-referrer` (cho API/static khi dùng backend phục vụ).
  - Link outbound dùng `rel="noreferrer"`.
  - Ảnh ngoài dùng `referrerpolicy="no-referrer"`.
- Trang “Attacker Console”: xem log các request nhận bởi attacker server và Referer tương ứng.

## API nhanh
- `GET /api/policy` → { fixActive }
- `POST /api/policy` body { fixActive: boolean }
- `GET /api/logs` → { items: RequestLog[] }
- Attacker server:
  - `GET http://localhost:4000/collect.gif` → log và trả ảnh 1x1
  - `GET http://localhost:4000/landing` → log và trả trang text

## Mô hình dữ liệu (Mongo)
Collection `requestlogs`:
```
{
  url: string,
  method: string,
  headers: object,
  referer: string,
  ip: string,
  policySnapshot: string, // ví dụ fixActive=true/false
  createdAt, updatedAt
}
```

## Lưu ý bảo mật bổ sung
- Tránh đưa token/PII vào URL; ưu tiên POST body, cookie httpOnly, hoặc fragment `#token` (fragment không xuất hiện trong Referer).
- Kiểm tra bên thứ ba nhúng (analytics, chat, ads, CDN) vì chúng có thể kích hoạt request ra ngoài domain.
- Ở production, nên cấu hình `Referrer-Policy: no-referrer` (hoặc policy phù hợp) ở web server/reverse proxy/CDN.

## Giấy phép
MIT
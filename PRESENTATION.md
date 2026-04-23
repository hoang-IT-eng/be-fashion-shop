# FASHION SHOP — BÁO CÁO DỰ ÁN BACKEND

---

## SLIDE 1 — GIỚI THIỆU DỰ ÁN

**Tên dự án:** Fashion Shop — Hệ thống bán quần áo thời trang trực tuyến

**Nhóm thực hiện:**
- Trương Hoàng Gia Bảo
- Đào Đức Toàn
- Ngô Thanh Hoàng
- Trần Đình Trí
- Trần Huy Hoàng

**Mục tiêu:** Xây dựng REST API backend hoàn chỉnh phục vụ website bán quần áo thời trang, bao gồm xác thực người dùng, quản lý sản phẩm, giỏ hàng và đơn hàng.

---

## SLIDE 2 — CÔNG NGHỆ SỬ DỤNG

| Thành phần | Công nghệ |
|-----------|-----------|
| Runtime | Node.js |
| Framework | NestJS v11 |
| Database | PostgreSQL + TypeORM |
| Authentication | JWT + Passport |
| Email | Nodemailer + Gmail SMTP |
| Lưu trữ ảnh | Cloudinary |
| API Docs | Swagger UI |
| Deploy | Render |
| CI/CD | GitHub Actions |
| Testing | Jest + Supertest (E2E) |

---

## SLIDE 3 — KIẾN TRÚC HỆ THỐNG

```
┌─────────────────────────────────────────┐
│           CLIENT (Frontend)             │
└──────────────────┬──────────────────────┘
                   │ HTTP Request
┌──────────────────▼──────────────────────┐
│         NestJS API Server               │
│         (Render - Production)           │
│                                         │
│  AuthModule    ProductsModule           │
│  UsersModule   CartModule               │
│  OrdersModule  CloudinaryModule         │
│  MailModule                             │
└──────┬──────────┬──────────┬────────────┘
       │          │          │
┌──────▼──┐ ┌────▼─────┐ ┌──▼──────────┐
│PostgreSQL│ │Cloudinary│ │ Gmail SMTP  │
│(Render) │ │(Ảnh SP)  │ │(Xác thực)  │
└─────────┘ └──────────┘ └─────────────┘
```

---

## SLIDE 4 — CẤU TRÚC MODULE

```
src/
├── auth/           Đăng ký, đăng nhập, JWT, RBAC
├── users/          Quản lý người dùng
├── products/       CRUD sản phẩm + upload ảnh
├── cart/           Giỏ hàng theo từng user
├── orders/         Đặt hàng và quản lý đơn
├── mail/           Gửi email xác thực
└── cloudinary/     Upload ảnh lên Cloudinary
```

---

## SLIDE 5 — TÍNH NĂNG XÁC THỰC (AUTH)

**Luồng đăng ký:**
```
Nhập thông tin → Hash password (bcrypt)
→ Tạo verifyToken (UUID) → Lưu DB
→ Gửi email xác thực → Chờ click link
→ isVerified = true → Được phép đăng nhập
```

**Luồng đăng nhập:**
```
Nhập email/password → Kiểm tra DB
→ So sánh bcrypt → Kiểm tra isVerified
→ Ký JWT (7 ngày) → Trả về accessToken
```

**Bảo mật:**
- Password hash bằng bcrypt (salt rounds = 10)
- JWT token có thời hạn 7 ngày
- Email phải xác thực trước khi đăng nhập

---

## SLIDE 6 — PHÂN QUYỀN RBAC

**2 Role:** `admin` và `user`

```
Request → JwtAuthGuard → RolesGuard → Controller
           (verify JWT)  (check role)
```

| Route | User | Admin |
|-------|------|-------|
| GET /products | ✅ | ✅ |
| POST /products | ❌ | ✅ |
| GET /cart | ✅ | ✅ |
| GET /orders | ❌ | ✅ |
| GET /orders/my | ✅ | ✅ |
| GET /users | ❌ | ✅ |

---

## SLIDE 7 — QUẢN LÝ SẢN PHẨM

**Thông tin sản phẩm:**
- Tên, mô tả, giá, tồn kho
- Danh mục, ảnh (Cloudinary URL)
- Sizes: S, M, L, XL...
- Colors: trắng, đen, xanh...
- Trạng thái active/inactive

**Tính năng:**
- Tìm kiếm theo tên
- Lọc theo danh mục
- Phân trang (page, limit)
- Upload ảnh lên Cloudinary

---

## SLIDE 8 — LUỒNG UPLOAD ẢNH

```
Admin chọn file từ máy
        ↓
POST /products/upload (multipart/form-data)
        ↓
Multer nhận file → lưu vào RAM (không lưu disk)
        ↓
Validate: chỉ nhận ảnh, tối đa 5MB
        ↓
CloudinaryService.uploadImage()
        ↓
Cloudinary lưu ảnh → trả về URL
        ↓
{ url: "https://res.cloudinary.com/...", publicId: "..." }
        ↓
Frontend dùng URL này khi tạo sản phẩm
```

---

## SLIDE 9 — GIỎ HÀNG & ĐƠN HÀNG

**Cart:**
- Mỗi user có giỏ hàng riêng (lưu DB theo userId)
- Thêm sản phẩm → tự động cộng dồn nếu đã có
- Cập nhật số lượng, xóa từng item

**Orders:**
- User tạo đơn từ giỏ hàng
- Trạng thái: pending → confirmed → shipping → delivered / cancelled
- User xem lịch sử đơn của mình
- Admin xem tất cả đơn, cập nhật trạng thái

---

## SLIDE 10 — API ENDPOINTS

**Đã hoàn thành (20 endpoints):**

| Module | Số API |
|--------|--------|
| Auth | 4 |
| Products | 6 |
| Users | 4 |
| Cart | 4 |
| Orders | 6 |

**Chưa làm (13 endpoints):**
- Forgot/Reset password
- Categories CRUD
- Dashboard stats
- Reviews
- User profile

---

## SLIDE 11 — CI/CD & DEPLOY

**GitHub Actions (CI):**
```
Push code → Chạy tự động:
  1. npm ci (install)
  2. npm run build (TypeScript compile)
  3. npm run test:e2e (9 test cases)
  → Pass → Render tự deploy
  → Fail → Block, không deploy
```

**Render (CD):**
- Auto deploy khi merge vào `main`
- PostgreSQL managed database
- Environment variables bảo mật

**Branch protection:**
- Không được push thẳng vào `main`
- Phải tạo Pull Request
- CI phải pass trước khi merge

---

## SLIDE 12 — TESTING

**E2E Test (9 test cases):**
- Tạo admin với đúng/sai secret
- Đăng nhập thành công/sai password
- Validation đăng ký (email, password)
- Bảo vệ route không có token → 401
- Admin token truy cập route protected → 200

**Kết quả:** 9/9 PASSED ✅

---

## SLIDE 13 — API DOCUMENTATION

**Swagger UI:** `https://be-fashion-shop-uvp9.onrender.com/api/docs`

- Xem toàn bộ API trực tiếp trên browser
- Test API không cần Postman
- Hỗ trợ Bearer token authentication
- Upload file ảnh trực tiếp

---

## SLIDE 14 — DEMO

**URL Production:** `https://be-fashion-shop-uvp9.onrender.com`

**Demo flow:**
1. `POST /auth/register` → nhận email xác thực
2. `GET /auth/verify-email?token=...` → xác thực
3. `POST /auth/login` → nhận JWT token
4. `POST /products/upload` → upload ảnh
5. `POST /products` → tạo sản phẩm
6. `POST /cart` → thêm vào giỏ
7. `POST /orders` → đặt hàng
8. `PATCH /orders/:id/status` → cập nhật trạng thái (admin)

---

## SLIDE 15 — KẾT LUẬN

**Đã đạt được:**
- Hệ thống xác thực JWT + RBAC hoàn chỉnh
- CRUD sản phẩm với upload ảnh Cloudinary
- Giỏ hàng và đơn hàng lưu DB
- CI/CD tự động với GitHub Actions
- API documentation với Swagger
- E2E testing

**Hướng phát triển:**
- Thêm Categories, Reviews, Dashboard
- Tích hợp thanh toán (VNPay, Momo)
- Refresh token
- Rate limiting, logging
- Migration thay cho synchronize

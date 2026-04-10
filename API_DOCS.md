# Fashion Shop API Documentation

Base URL: `http://localhost:3000`  
Production: thay bằng URL deploy trên Render

---

## Authentication

Các route có 🔒 yêu cầu JWT token trong header:
```
Authorization: Bearer <accessToken>
```

Roles:
- `user` — người dùng thường
- `admin` — quản trị viên

---

## Auth

### POST /auth/register
Đăng ký tài khoản mới. Gửi email xác thực sau khi đăng ký.

**Body:**
```json
{
  "name": "Nguyễn Văn A",
  "email": "user@gmail.com",
  "password": "123456"
}
```

**Response 201:**
```json
{
  "message": "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản."
}
```

**Errors:** `400` validation | `409` email đã tồn tại

---

### GET /auth/verify-email?token=xxx
Xác thực email sau khi nhấn link trong mail.

**Query:** `token` — token nhận từ email

**Response 200:**
```json
{
  "message": "Xác thực email thành công. Bạn có thể đăng nhập ngay bây giờ."
}
```

**Errors:** `400` token không hợp lệ

---

### POST /auth/login
Đăng nhập, nhận JWT token.

**Body:**
```json
{
  "email": "user@gmail.com",
  "password": "123456"
}
```

**Response 201:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Nguyễn Văn A",
    "email": "user@gmail.com",
    "role": "user"
  }
}
```

**Errors:** `401` sai email/password | `401` chưa xác thực email

---

## Products

### GET /products
Lấy danh sách sản phẩm. Public, không cần token.

**Query params (tất cả optional):**
| Param | Type | Mô tả |
|-------|------|-------|
| search | string | Tìm theo tên sản phẩm |
| category | string | Lọc theo danh mục |
| page | number | Trang hiện tại (default: 1) |
| limit | number | Số item mỗi trang (default: 10) |

**Ví dụ:** `GET /products?search=áo&category=ao&page=1&limit=10`

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Áo thun basic",
      "description": "Áo thun cotton 100%",
      "price": "199000.00",
      "stock": 50,
      "category": "ao",
      "imageUrl": "https://...",
      "sizes": ["S", "M", "L", "XL"],
      "colors": ["trắng", "đen", "xanh"],
      "isActive": true,
      "createdAt": "2026-04-09T13:00:00.000Z",
      "updatedAt": "2026-04-09T13:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

---

### GET /products/:id
Lấy chi tiết một sản phẩm. Public.

**Response 200:** object Product (xem cấu trúc ở trên)

**Errors:** `404` không tìm thấy

---

### POST /products 🔒 (admin)
Tạo sản phẩm mới.

**Headers:** `Authorization: Bearer <adminToken>`

**Body:**
```json
{
  "name": "Áo thun basic",
  "price": 199000,
  "stock": 50,
  "category": "ao",
  "description": "Áo thun cotton 100%",
  "imageUrl": "https://example.com/image.jpg",
  "sizes": ["S", "M", "L", "XL"],
  "colors": ["trắng", "đen", "xanh"],
  "isActive": true
}
```

> `name` và `price` là bắt buộc. Các field còn lại optional.

**Response 201:** object Product vừa tạo

**Errors:** `400` validation | `401` chưa đăng nhập | `403` không phải admin

---

### PUT /products/:id 🔒 (admin)
Cập nhật sản phẩm. Chỉ cần gửi các field muốn thay đổi.

**Headers:** `Authorization: Bearer <adminToken>`

**Body (partial):**
```json
{
  "price": 249000,
  "stock": 30
}
```

**Response 200:** object Product sau khi cập nhật

**Errors:** `404` không tìm thấy | `401` | `403`

---

### DELETE /products/:id 🔒 (admin)
Xóa sản phẩm.

**Headers:** `Authorization: Bearer <adminToken>`

**Response 200:**
```json
{
  "message": "Đã xóa sản phẩm id=1 thành công"
}
```

**Errors:** `404` không tìm thấy | `401` | `403`

---

## Users 🔒 (admin)

> Tất cả route `/users` đều yêu cầu token admin.

### GET /users
Lấy danh sách tất cả users.

**Response 200:** array of User objects

---

### GET /users/:id
Lấy thông tin một user.

**Response 200:**
```json
{
  "id": 1,
  "name": "Nguyễn Văn A",
  "email": "user@gmail.com",
  "role": "user",
  "isVerified": true
}
```

---

### PUT /users/:id 🔒 (admin)
Cập nhật thông tin user.

**Body:**
```json
{
  "name": "Tên mới"
}
```

---

### DELETE /users/:id 🔒 (admin)
Xóa user.

**Response 200:**
```json
{
  "message": "Đã xóa user id=1 thành công"
}
```

---

## Error Response Format

Tất cả lỗi đều trả về format chuẩn NestJS:

```json
{
  "statusCode": 400,
  "message": ["name should not be empty"],
  "error": "Bad Request"
}
```

---

## Lưu ý cho Frontend

1. Lưu `accessToken` vào `localStorage` hoặc `sessionStorage` sau khi login.
2. Gắn token vào mọi request cần auth: `Authorization: Bearer <token>`
3. Token hết hạn sau **7 ngày**, cần login lại.
4. `price` trả về dạng string decimal (ví dụ `"199000.00"`) — parse sang number khi hiển thị.
5. `sizes` và `colors` là mảng string, có thể `null` nếu không có.

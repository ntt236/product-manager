# Product Management System API (Node.js + PostgreSQL Supabase + Render)

Hệ thống quản lý sản phẩm với xác thực JWT và phân quyền theo vai trò (Role-Based Access Control - RBAC) sử dụng Express.js, Supabase PostgreSQL và triển khai lên Render.

---

## 1. Cài đặt & Chạy ở máy local

### Bước 1: Cài thư viện
```bash
npm install
```

### Bước 2: Tạo file `.env`
Tạo file `.env` tại thư mục gốc từ mẫu `.env.example`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=your_supabase_postgresql_connection_string
JWT_SECRET=your_secret_key_at_least_32_chars
JWT_EXPIRES_IN=1h
CORS_ORIGIN=*
```

### Bước 3: Nạp dữ liệu mẫu (Seeding)
Tự động nạp các role, tài khoản demo và danh mục/sản phẩm mẫu lên Supabase:
```bash
npm run seed
```

### Bước 4: Chạy server
- Chế độ development:
  ```bash
  npm run dev
  ```
- Chế độ production:
  ```bash
  npm start
  ```
- Truy cập kiểm tra: `http://localhost:3000/health`

---

## 2. Tài khoản mẫu (Demo Accounts)

Hệ thống đã có sẵn 3 tài khoản với quyền hạn khác nhau:

| Email | Mật khẩu | Vai trò (Role) | Quyền hạn |
|---|---|---|---|
| `admin@example.com` | `Admin@123456` | **admin** | Toàn quyền (Thêm, sửa, xóa danh mục và sản phẩm) |
| `manager@example.com` | `Manager@123456` | **manager** | Xem, tạo và sửa sản phẩm / danh mục (Không có quyền xóa) |
| `user@example.com` | `User@123456` | **user** | Chỉ có quyền xem danh sách sản phẩm và danh mục |

---

## 3. Danh sách API chính

Header bắt buộc cho các endpoint yêu cầu đăng nhập:
```http
Authorization: Bearer <token_nhan_duoc_khi_login>
```

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Đăng ký tài khoản mới (mặc định role `user`).
- `POST /api/auth/login`: Đăng nhập, nhận token JWT.
- `GET /api/auth/me`: Lấy thông tin cá nhân của token hiện tại.
- `POST /api/auth/logout`: Đăng xuất.

### Categories (`/api/categories`)
- `GET /api/categories`: Xem danh sách danh mục (Tất cả role).
- `GET /api/categories/:id`: Xem chi tiết 1 danh mục.
- `POST /api/categories`: Tạo danh mục mới (`admin`, `manager`).
- `PUT /api/categories/:id`: Sửa danh mục (`admin`, `manager`).
- `DELETE /api/categories/:id`: Xóa danh mục (`admin`).

### Products (`/api/products`)
- `GET /api/products?page=1&limit=10&search=keyword&category_id=1`: Lấy danh sách sản phẩm (có phân trang, tìm kiếm, lọc).
- `GET /api/products/:id`: Xem chi tiết 1 sản phẩm.
- `POST /api/products`: Thêm sản phẩm mới (`admin`, `manager`).
- `PUT /api/products/:id`: Sửa sản phẩm (`admin`, `manager`).
- `DELETE /api/products/:id`: Xóa sản phẩm (`admin`).

---

## 4. Chạy kiểm thử (Testing)
Chạy bộ test tự động (25 test cases bao gồm Auth, RBAC, Validation, Health):
```bash
npm test
```

---

## 5. Hướng dẫn Deploy lên Render (3 phút)

1. Đăng nhập [dashboard.render.com](https://dashboard.render.com).
2. Bấm **New +** -> Chọn **Web Service**.
3. Chọn kho GitHub: `ntt236/product-manager`.
4. Điền cấu hình cơ bản:
   - **Name**: `product-management-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
5. Thêm các biến tại mục **Environment Variables**:
   - `DATABASE_URL`: `[Chuỗi kết nối Supabase URI của bạn]`
   - `JWT_SECRET`: `[Chuỗi bí mật JWT tùy chọn >= 32 ký tự]`
   - `JWT_EXPIRES_IN`: `1h`
   - `NODE_ENV`: `production`
   - `CORS_ORIGIN`: `*`
6. Bấm **Deploy Web Service** và chờ Render hoàn tất.

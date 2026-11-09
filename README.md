# Product Management System API

## Hướng dẫn cài đặt và chạy nhanh

### 1. Cài đặt thư viện
```bash
npm install
```

### 2. Cấu hình biến môi trường
Tạo file `.env` tại thư mục gốc của dự án với nội dung:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=your_supabase_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key_at_least_32_characters
JWT_EXPIRES_IN=1h
CORS_ORIGIN=*
```

### 3. Nạp dữ liệu mẫu (Seeding)
Chạy lệnh sau để tự động tạo tài khoản test và dữ liệu mẫu lên database:
```bash
npm run seed
```

Tài khoản mẫu được tạo sẵn:
- **Admin**: `admin@example.com` / `Admin@123456`
- **Manager**: `manager@example.com` / `Manager@123456`
- **User**: `user@example.com` / `User@123456`

### 4. Khởi động server
- Chế độ phát triển (tự reload khi sửa code):
  ```bash
  npm run dev
  ```
- Chế độ chuẩn:
  ```bash
  npm start
  ```

Kiểm tra server đang chạy tại: `http://localhost:3000/health`

### 5. Chạy test
```bash
npm test
```

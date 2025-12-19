# Backend API Documentation - Enterprise Management System

> **Mục đích:** Tài liệu đầy đủ và có tổ chức cho phát triển Mobile App, bao gồm tất cả API endpoints và cấu trúc dữ liệu.

> [!WARNING]
> **🚀 UPCOMING: Multi-tenant SaaS Rebuild**
> 
> Hệ thống sẽ được rebuild thành Multi-tenant SaaS với các thay đổi lớn:
> - Company entity mới
> - CompanyMember thay thế User.role
> - Feature flags per company
> - Permission system per user
> 
> **Xem chi tiết:** [Implementation Plan](file:///c:/DACN/docs/multitenant_plan.md)

---

## 📑 Table of Contents

1. [COMMON - Cấu hình hệ thống](#1-common)
2. [USER - Quản lý người dùng](#2-user)
3. [AUTH - Authentication](#3-auth)
4. [HR - Human Resources](#4-hr) *(Phase 2)*
5. [PROJECT - Agile/Scrum](#5-project) *(Phase 3)*
6. [CHAT - Real-time Messaging](#6-chat) *(Phase 4)*
7. [NOTIFICATION - Thông báo](#7-notification) *(Phase 5)*

---

## 1. COMMON - Cấu hình hệ thống {#1-common}

### 🌐 Base Configuration

| Setting | Value |
|---------|-------|
| Base URL | `http://localhost:8080` |
| Timezone | `Asia/Ho_Chi_Minh (UTC+7)` |
| Charset | `UTF-8` |

### 🔑 JWT Configuration

```yaml
Access Token:
  - Expiration: 24 hours (86400000ms)
  - Header: Authorization: Bearer <token>

Refresh Token:
  - Expiration: 7 days (604800000ms)
```

### 🔐 Session & Security

```yaml
Session:
  - Timeout: 30 minutes
  - Max Concurrent Sessions: 5 per user

Login Security:
  - Max Attempts: 5
  - Lockout Duration: 15 minutes
```

### 📁 File Upload

```yaml
Max File Size: 10MB
Max Request Size: 10MB
Upload Directory: ./uploads
```

### 📍 GPS Configuration (Chấm công)

```yaml
Company Location:
  - Latitude: 10.855059 (HUTECH Khu E - Khu Công nghệ Cao, HCM)
  - Longitude: 106.779390 (HUTECH Khu E - Khu Công nghệ Cao, HCM)
  - Allowed Radius: 50000 meters (50km - CHỈ DÙNG CHO TEST)
  - Production Radius: 500 meters (đổi lại khi deploy production)
```

**GPS Utility Functions:**
- `calculateDistance(lat1, lon1, lat2, lon2)` → Returns distance in meters (Haversine formula)
- `isWithinRadius(userLat, userLon, radius)` → Returns boolean

### ❌ Error Handling

**Standard Error Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Invalid request parameters",
  "path": "/api/endpoint"
}
```

**Validation Error Response:**
```json
{
  "username": "Username không được để trống",
  "email": "Email không hợp lệ"
}
```

**HTTP Status Codes:**

| Code | Exception | Description |
|------|-----------|-------------|
| 400 | BadRequestException | Invalid request |
| 400 | HttpMessageNotReadableException | Invalid JSON/enum |
| 400 | MethodArgumentNotValidException | Validation error |
| 401 | UnauthorizedException | Not authenticated |
| 403 | ForbiddenException | No permission |
| 403 | ProjectAccessDeniedException | No project access |
| 404 | EntityNotFoundException | Resource not found |
| 404 | StorageFileNotFoundException | File not found |
| 409 | DuplicateException | Duplicate resource |
| 409 | DataIntegrityViolationException | Database constraint |
| 413 | MaxUploadSizeExceededException | File too large |
| 413 | StorageQuotaExceededException | Quota exceeded |
| 500 | FileStorageException | Storage error |
| 500 | Exception | Unhandled error |
### 🔐 User Roles & Permissions

**Roles:**
- `ADMIN` - Quản trị hệ thống, quản lý users (không truy cập business data)
- `MANAGER_HR` - Quản lý nhân sự, hợp đồng, đánh giá (không xem lương)
- `MANAGER_ACCOUNTING` - Quản lý kế toán, lương, chấm công (full quyền lương)
- `MANAGER_PROJECT` - Quản lý dự án, sprint, issues
- `EMPLOYEE` - Nhân viên, self-service

**Protected Endpoints Pattern (Chi tiết từ SecurityConfig.java):**

| Endpoint | Roles Allowed |
|----------|---------------|
| **Public** | |
| `/api/auth/**` | Không cần auth |
| `/api/public/**` | Không cần auth |
| `/ws/**` | Không cần auth (WebSocket) |
| **Admin Only** | |
| `/api/admin/**` | ADMIN |
| `/api/users/**` (trừ GET) | ADMIN |
| `/api/accounts/**` (trừ with-employee) | ADMIN |
| `/api/audit-logs/**` | ADMIN |
| **HR Manager** | |
| `/api/nhan-vien/**` | ADMIN, MANAGER_HR, MANAGER_ACCOUNTING |
| `/api/phong-ban/**` | MANAGER_HR |
| `/api/chuc-vu/**` | MANAGER_HR |
| `/api/hop-dong/**` | MANAGER_HR |
| `/api/danh-gia/**` | MANAGER_HR, MANAGER_PROJECT, EMPLOYEE |
| **Accounting Manager** | |
| `/api/bang-luong/tinh-tu-dong/**` | MANAGER_ACCOUNTING |
| `/api/cham-cong/manage/**` | MANAGER_ACCOUNTING |
| `/api/export/**` | MANAGER_HR, MANAGER_ACCOUNTING |
| `/api/dashboard/**` | MANAGER_HR, MANAGER_ACCOUNTING, MANAGER_PROJECT |
| **Project** | |
| `/api/projects/**` | MANAGER_PROJECT, EMPLOYEE |
| `/api/issues/**` | MANAGER_PROJECT, EMPLOYEE |
| `/api/sprints/**` | MANAGER_PROJECT, EMPLOYEE |
| **All Users (trừ Admin)** | |
| `/api/chat/**` | EMPLOYEE, MANAGER_HR, MANAGER_ACCOUNTING, MANAGER_PROJECT |
| `/api/ai/**` | EMPLOYEE, MANAGER_HR, MANAGER_ACCOUNTING, MANAGER_PROJECT |
| `/api/cham-cong/gps` | EMPLOYEE, MANAGER_HR, MANAGER_ACCOUNTING, MANAGER_PROJECT |
| **Authenticated** | |
| `/api/profile/**` | All authenticated |
| `/api/storage/**` | All authenticated |
| `/api/notifications/**` | All authenticated |

---

## 2. USER - Quản lý người dùng {#2-user}

### 📊 Entities

#### User
| Field | Type | Description |
|-------|------|-------------|
| userId | Long | ID (PK) |
| username | String | Username (unique) |
| email | String | Email (unique) |
| passwordHash | String | Hashed password |
| phoneNumber | String | Phone |
| avatarUrl | String | Avatar URL |
| role | Enum | User role |
| isActive | Boolean | Active status |
| createdAt | LocalDateTime | Created date |
| updatedAt | LocalDateTime | Updated date |
| lastLogin | LocalDateTime | Last login |
| isOnline | Boolean | Online status |
| lastSeen | LocalDateTime | Last seen |
| fcmToken | String | FCM push token |

#### RoleChangeRequest
| Field | Type | Description |
|-------|------|-------------|
| requestId | Long | ID (PK) |
| targetUser | User | Target user |
| currentRole | Enum | Current role |
| requestedRole | Enum | Requested role |
| requestedBy | User | Requester (HR) |
| reason | String | Reason |
| status | Enum | PENDING / APPROVED / REJECTED |
| reviewedBy | User | Reviewer (Admin) |
| reviewNote | String | Review note |
| createdAt | LocalDateTime | Created date |
| reviewedAt | LocalDateTime | Reviewed date |

### 🔌 API Endpoints

#### `/api/users` - User Management (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users` | Create user |
| GET | `/api/users` | Get all users |
| GET | `/api/users/{userId}` | Get user by ID |
| PUT | `/api/users/{userId}` | Update user |
| DELETE | `/api/users/{userId}` | Delete user |
| PATCH | `/api/users/{userId}/activate` | Activate user |
| PATCH | `/api/users/{userId}/deactivate` | Deactivate user |
| GET | `/api/users/search?keyword=xxx` | Search users |
| GET | `/api/users/role/{role}` | Filter by role |
| GET | `/api/users/active` | Get active users |
| GET | `/api/users/online` | Get online users |
| GET | `/api/users/count/role/{role}` | Count by role |
| GET | `/api/users/count/online` | Count online users |

#### `/api/profile` - Profile Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | **Get my profile** |
| GET | `/api/profile/me` | Get my profile (alias) |
| PUT | `/api/profile` | Update profile |
| PUT | `/api/profile/me` | Update profile (alias) |
| POST | `/api/profile/change-password` | Change password |
| PATCH | `/api/profile/online` | Set online |
| PATCH | `/api/profile/offline` | Set offline |
| PUT | `/api/profile/fcm-token` | **Update FCM token** |

#### `/api/accounts` - Account Management (Admin & HR)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/accounts/with-employee` | **Create account + employee** |
| GET | `/api/accounts` | List accounts |
| GET | `/api/accounts/{accountId}` | Get account |
| PUT | `/api/accounts/{accountId}` | Update account |
| PUT | `/api/accounts/{accountId}/change-password` | Change password |
| PATCH | `/api/accounts/{accountId}/toggle-status` | Toggle status |
| DELETE | `/api/accounts/{accountId}` | Delete account |
| GET | `/api/accounts/search?query=xxx` | Search accounts |

#### Role Change Requests

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/hr/role-change-request` | **HR create request** |
| GET | `/api/hr/role-change-request/my-requests` | My requests |
| GET | `/api/admin/role-requests` | **Admin view all** |
| GET | `/api/admin/role-requests/pending` | Pending requests |
| PUT | `/api/admin/role-requests/{requestId}/approve` | **Approve** |
| PUT | `/api/admin/role-requests/{requestId}/reject` | **Reject** |

### 📦 DTOs

**UserDTO (Response):**
```json
{
  "userId": 1,
  "username": "admin",
  "email": "admin@example.com",
  "phoneNumber": "0123456789",
  "avatarUrl": "https://...",
  "role": "ADMIN",
  "isActive": true,
  "isOnline": true,
  "lastSeen": "2024-01-15T10:30:00",
  "createdAt": "2024-01-01T08:00:00",
  "lastLogin": "2024-01-15T08:00:00",
  "nhanvienId": 123
}
```

**CreateAccountWithEmployeeRequest:**
```json
{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com",
  "phoneNumber": "0987654321",
  "role": "EMPLOYEE",
  "hoTen": "Nguyễn Văn A",
  "cccd": "001234567890",
  "ngaySinh": "1990-01-01",
  "gioiTinh": "Nam",
  "diaChi": "Hà Nội",
  "ngayVaoLam": "2024-01-01",
  "phongbanId": 1,
  "chucvuId": 2,
  "luongCoBan": 15000000,
  "phuCap": 2000000
}
```

---

## 3. AUTH - Authentication {#3-auth}

### 📊 Entities

#### RefreshToken
| Field | Type | Description |
|-------|------|-------------|
| id | Long | ID (PK) |
| token | String | Token (unique) |
| user | User | Owner |
| expiresAt | LocalDateTime | Expiration |
| isRevoked | Boolean | Revoked |
| createdAt | LocalDateTime | Created |

#### UserSession
| Field | Type | Description |
|-------|------|-------------|
| id | Long | ID (PK) |
| user | User | User |
| sessionId | String | Session ID (unique) |
| ipAddress | String | IP |
| userAgent | String | User agent |
| createdAt | LocalDateTime | Created |
| lastActivity | LocalDateTime | Last activity |
| isActive | Boolean | Active |

#### LoginAttempt
| Field | Type | Description |
|-------|------|-------------|
| id | Long | ID (PK) |
| username | String | Username |
| ipAddress | String | IP |
| success | Boolean | Success |
| failureReason | String | Failure reason |
| attemptedAt | LocalDateTime | Attempted at |

### 🔌 API Endpoints `/api/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | **Login** (body: LoginRequest) |
| POST | `/api/auth/refresh` | **Refresh token** (body: {refreshToken}) |
| POST | `/api/auth/logout` | Logout (body: {refreshToken?, sessionId?}) |
| POST | `/api/auth/logout-all?userId={id}` | **Logout all devices** (query param) |
| GET | `/api/auth/validate?token={token}` | Validate token (query param) |

### 📦 DTOs

**LoginRequest:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**AuthResponse:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "userInfo": {
    "userId": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "ADMIN",
    "isActive": true
  }
}
```

### 📱 Mobile Integration

**Authentication Flow:**

```
1. Login
   POST /api/auth/login
   → Receive accessToken + refreshToken
   
2. Store tokens securely
   - accessToken: Memory or secure cache
   - refreshToken: Secure Storage (Keychain/Keystore)
   
3. Add token to all requests
   Authorization: Bearer {accessToken}
   
4. Handle token expiration (401)
   POST /api/auth/refresh with refreshToken
   → Get new accessToken
   
5. Logout
   POST /api/auth/logout
   → Clear all tokens
```

**Security Features:**
- JWT with 24h access token
- 7-day refresh token
- Multi-device sessions (max 5)
- Login attempt tracking
- Automatic lockout after 5 failed attempts

---

## 4. HR - Human Resources Management {#4-hr}

### 📊 Entities

#### 1. NhanVien (Nhân viên)
| Field | Type | Description |
|-------|------|-------------|
| nhanvienId | Long | ID (PK) |
| user | User | User account (1-1) |
| hoTen | String | Full name |
| cccd | String | ID card (unique) |
| ngaySinh | LocalDate | Date of birth |
| gioiTinh | Enum | Nam / Nữ / Khác |
| diaChi | String | Address |
| ngayVaoLam | LocalDate | Start date |
| trangThai | Enum | DANG_LAM_VIEC / NGHI_VIEC / TAM_NGHI |
| phongBan | PhongBan | Department |
| chucVu | ChucVu | Position |
| luongCoBan | BigDecimal | Base salary |
| phuCap | BigDecimal | Allowance |

#### 2. ChamCong (Attendance) ⭐ GPS-enabled
| Field | Type | Description |
|-------|------|-------------|
| chamcongId | Long | ID (PK) |
| nhanVien | NhanVien | Employee |
| ngayCham | LocalDate | Date |
| gioVao | LocalTime | Check-in time |
| gioRa | LocalTime | Check-out time |
| soGioLam | BigDecimal | Working hours |
| trangThai | Enum | DI_TRE / VE_SOM / DU_GIO / NGHI_PHEP / NGHI_KHONG_PHEP |
| ghiChu | String | Note |
| **latitude** | Double | **GPS latitude** |
| **longitude** | Double | **GPS longitude** |
| diaChiCheckin | String | Check-in address |
| **khoangCach** | Double | **Distance from office (meters)** |
| phuongThuc | Enum | GPS / MANUAL / QR_CODE / FACE_ID |
| loaiCa | Enum | SANG / CHIEU / TOI / FULL |

#### 3. BangLuong (Salary)
| Field | Type | Description |
|-------|------|-------------|
| bangluongId | Long | ID (PK) |
| nhanVien | NhanVien | Employee |
| thang | Integer | Month |
| nam | Integer | Year |
| luongCoBan | BigDecimal | Base salary |
| phuCap | BigDecimal | Allowance |
| thuong | BigDecimal | Bonus |
| phat | BigDecimal | Penalty |
| tongLuong | BigDecimal | Total salary |
| baoHiem | BigDecimal | Insurance |
| thue | BigDecimal | Tax |
| thucNhan | BigDecimal | Net salary |
| trangThai | String | CHUA_THANH_TOAN / DA_THANH_TOAN / HUY |
| ghiChu | String | Note |

#### 4. NghiPhep (Leave Request)
| Field | Type | Description |
|-------|------|-------------|
| nghiphepId | Long | ID (PK) |
| nhanVien | NhanVien | Employee |
| loaiNghiPhep | String | Annual / Sick / Personal / Other |
| tuNgay | LocalDate | From date |
| denNgay | LocalDate | To date |
| soNgay | Integer | Number of days |
| lyDo | String | Reason |
| trangThai | Enum | CHO_DUYET / DUYET / TU_CHOI |
| nguoiDuyet | User | Approver |
| ghiChu | String | Note |

#### 5. PhongBan (Department)
| Field | Type | Description |
|-------|------|-------------|
| phongbanId | Long | ID (PK) |
| tenPhongBan | String | Department name |
| moTa | String | Description |
| truongPhong | NhanVien | Manager |

#### 6. ChucVu (Position)
| Field | Type | Description |
|-------|------|-------------|
| chucvuId | Long | ID (PK) |
| tenChucVu | String | Position name |
| moTa | String | Description |
| heSoLuong | BigDecimal | Salary coefficient |

#### 7. HopDong (Contract)
| Field | Type | Description |
|-------|------|-------------|
| hopdongId | Long | ID (PK) |
| nhanVien | NhanVien | Employee |
| soHopDong | String | Contract number |
| loaiHopDong | Enum | THU_VIEC / XAC_DINH / VO_THOI_HAN |
| ngayBatDau | LocalDate | Start date |
| ngayKetThuc | LocalDate | End date |
| trangThai | Enum | HIEU_LUC / HET_HAN / HUY |

#### 8. DanhGia (Performance Review)
| Field | Type | Description |
|-------|------|-------------|
| danhgiaId | Long | ID (PK) |
| nhanVien | NhanVien | Employee |
| nguoiDanhGia | User | Reviewer |
| ky | String | Review period |
| diemSo | Integer | Score (1-10) |
| nhanXet | String | Comments |

### 🔌 API Endpoints

#### `/nhan-vien` - Employee Management (No `/api` prefix)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/nhan-vien` | Create employee |
| GET | `/nhan-vien` | Get all employees |
| GET | `/nhan-vien/page?page=0&size=10` | **Paginated list** |
| GET | `/nhan-vien/{id}` | Get by ID |
| PUT | `/nhan-vien/{id}` | Update employee |
| DELETE | `/nhan-vien/{id}` | Delete employee |
| GET | `/nhan-vien/search?keyword=xxx` | Search employees |
| GET | `/nhan-vien/trang-thai/{trangThai}` | Filter by status |
| GET | `/nhan-vien/phong-ban/{phongbanId}` | Filter by department |
| GET | `/nhan-vien/chuc-vu/{chucvuId}` | Filter by position |
| PATCH | `/nhan-vien/{id}/trang-thai` | Update status |
| GET | `/nhan-vien/user/{userId}` | **Get by userId** |
| GET | `/nhan-vien/user/{userId}/exists` | Check if user has employee |

#### `/api/cham-cong` - Attendance (⭐ GPS-enabled for Mobile)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cham-cong` | Manual create |
| GET | `/api/cham-cong/{id}` | Get by ID |
| GET | `/api/cham-cong` | Get all |
| PUT | `/api/cham-cong/{id}` | Update |
| DELETE | `/api/cham-cong/{id}` | Delete |
| GET | `/api/cham-cong/nhan-vien/{nhanvienId}` | Employee's attendance |
| GET | `/api/cham-cong/date-range?startDate=...&endDate=...` | Filter by date range |
| GET | `/api/cham-cong/nhan-vien/{id}/month?year=2024&month=1` | Monthly attendance |
| GET | `/api/cham-cong/nhan-vien/{id}/working-days?year=...&month=...` | Count working days |
| GET | `/api/cham-cong/nhan-vien/{id}/total-hours?year=...&month=...` | Total hours |
| GET | `/api/cham-cong/nhan-vien/{id}/statistics?year=...&month=...` | Late/early statistics |
| POST | `/api/cham-cong/check-in?nhanvienId=...&ngayCham=...` | Manual check-in |
| PATCH | `/api/cham-cong/{id}/check-out` | Check-out |
| **POST** | **`/api/cham-cong/gps`** | **⭐ GPS-based check-in** |
| **GET** | **`/api/cham-cong/status/{nhanvienId}`** | **Today's status** |

#### `/bang-luong` - Salary Management (No `/api` prefix)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bang-luong` | Create salary record |
| GET | `/bang-luong/{id}` | Get by ID |
| GET | `/bang-luong` | Get all |
| GET | `/bang-luong/page?page=0&size=10` | Paginated list |
| PUT | `/bang-luong/{id}` | Update |
| DELETE | `/bang-luong/{id}` | Delete |
| GET | `/bang-luong/nhan-vien/{nhanvienId}` | Employee's salaries |
| GET | `/bang-luong/period?thang=1&nam=2024` | By period |
| GET | `/bang-luong/nhan-vien/{id}?thang=1&nam=2024` | Employee salary by period |
| GET | `/bang-luong/trang-thai/{trangThai}` | Filter by status |
| PATCH | `/bang-luong/{id}/paid` | Mark as paid |
| PATCH | `/bang-luong/{id}/cancel` | Cancel |
| GET | `/bang-luong/total?thang=1&nam=2024` | Total for period |
| GET | `/bang-luong/nhan-vien/{id}/year/{nam}` | Annual total |
| POST | `/bang-luong/{nhanvienId}/auto?thang=1&nam=2024` | **Auto calculate** |
| POST | `/bang-luong/auto-all?thang=1&nam=2024` | **Auto calculate all** |

#### `/api/nghi-phep` - Leave Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/nghi-phep` | Create leave request |
| GET | `/api/nghi-phep/{id}` | Get by ID |
| GET | `/api/nghi-phep` | Get all |
| PUT | `/api/nghi-phep/{id}` | Update |
| DELETE | `/api/nghi-phep/{id}` | Delete |
| GET | `/api/nghi-phep/nhan-vien/{nhanvienId}` | Employee's requests |
| GET | `/api/nghi-phep/my` | **My leave requests** |
| GET | `/api/nghi-phep/date-range?startDate=...&endDate=...` | Filter by date |
| GET | `/api/nghi-phep/pending` | **Pending requests** |
| GET | `/api/nghi-phep/approved` | Approved |
| GET | `/api/nghi-phep/rejected` | Rejected |
| **PATCH** | **`/api/nghi-phep/approve/{id}/pm`** | **Step 1: PM duyệt (kiểm tra tiến độ dự án)** |
| **PATCH** | **`/api/nghi-phep/approve/{id}/accounting`** | **Step 2: Accounting duyệt (kiểm tra phép tồn/lương)** |
| PATCH | `/api/nghi-phep/{id}/approve` | Legacy approve (backward compat) |
| PATCH | `/api/nghi-phep/{id}/reject` | **Reject** |
| GET | `/api/nghi-phep/nhan-vien/{id}/total-days?year=2024` | Total leave days |
| GET | `/api/nghi-phep/nhan-vien/{id}/is-on-leave?date=...` | Check if on leave |

#### `/phong-ban` - Department Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/phong-ban` | Create department |
| GET | `/phong-ban` | Get all |
| GET | `/phong-ban/{id}` | Get by ID |
| PUT | `/phong-ban/{id}` | Update |
| DELETE | `/phong-ban/{id}` | Delete |

#### `/chuc-vu` - Position Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chuc-vu` | Create position |
| GET | `/chuc-vu` | Get all |
| GET | `/chuc-vu/{id}` | Get by ID |
| PUT | `/chuc-vu/{id}` | Update |
| DELETE | `/chuc-vu/{id}` | Delete |

#### `/hop-dong` - Contract Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/hop-dong` | Create contract |
| GET | `/hop-dong` | Get all |
| GET | `/hop-dong/{id}` | Get by ID |
| PUT | `/hop-dong/{id}` | Update |
| DELETE | `/hop-dong/{id}` | Delete |
| GET | `/hop-dong/nhan-vien/{nhanvienId}` | **Employee's contracts** |
| GET | `/hop-dong/nhan-vien/{nhanvienId}/active` | **Active contract** |
| GET | `/hop-dong/nhan-vien/{nhanvienId}/has-active` | Check active contract |
| GET | `/hop-dong/trang-thai/{trangThai}` | Filter by status |
| GET | `/hop-dong/expiring?daysAhead=30` | **Expiring soon** |
| PATCH | `/hop-dong/{id}/cancel` | Cancel contract |
| PATCH | `/hop-dong/{id}/renew?newEndDate=...` | **Renew contract** |
| POST | `/hop-dong/update-expired` | Batch update expired |

#### `/api/danh-gia` - Performance Review

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/danh-gia` | Create review |
| GET | `/api/danh-gia` | Get all |
| GET | `/api/danh-gia/page?page=0&size=10` | **Paginated list** |
| GET | `/api/danh-gia/{id}` | Get by ID |
| PUT | `/api/danh-gia/{id}` | Update |
| DELETE | `/api/danh-gia/{id}` | Delete |
| GET | `/api/danh-gia/nhan-vien/{nhanvienId}` | **Employee's reviews** |
| GET | `/api/danh-gia/pending` | **Pending reviews** |
| PATCH | `/api/danh-gia/{id}/submit` | Submit for approval |
| PATCH | `/api/danh-gia/{id}/approve` | **Approve** |
| PATCH | `/api/danh-gia/{id}/reject` | **Reject** |

#### `/api/dashboard` - HR Dashboard (Manager/Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/tong-quan` | **Overview** |
| GET | `/api/dashboard/thang?thang=1&nam=2024` | Monthly stats |
| GET | `/api/dashboard/stats` | **Detailed stats** |
| GET | `/api/dashboard/cham-cong-phong-ban` | Attendance by department |
| GET | `/api/dashboard/luong-theo-thang` | Salary trend |
| GET | `/api/dashboard/nhan-vien-theo-tuoi` | Age distribution |
| GET | `/api/dashboard/nhan-vien-theo-gioi-tinh` | Gender distribution |

#### `/api/export` - Export Excel (Manager/Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export/nhan-vien/excel` | **Export employee list** |
| GET | `/api/export/cham-cong/excel?thang=10&nam=2024` | **Export attendance** |
| GET | `/api/export/bang-luong/excel?thang=10&nam=2024` | **Export salary** |
| GET | `/api/export/nghi-phep/excel?startDate=...&endDate=...` | **Export leave requests** |

**Export Response:** Binary Excel file (.xlsx)
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="DanhSachNhanVien_28012024.xlsx"
```

#### `/api/hr/salary-proposal` - Salary Increase Proposals (Project Manager)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/hr/salary-proposal` | **Propose salary increase** |

**Salary Increase Request:**
```json
{
  "nhanVienId": 123,
  "proposedSalary": 20000000,
  "reason": "Exceptional performance in Q4"
}
```

### 📦 DTOs

**ChamCongGPSRequest (⭐ Critical for Mobile):**
```json
{
  "nhanvienId": 123,
  "latitude": 21.0285,
  "longitude": 105.8542,
  "diaChiCheckin": "Hà Nội, Vietnam"
}
```

**GPS Check-in Response:**
```json
{
  "chamcongId": 456,
  "nhanvienId": 123,
  "ngayCham": "2024-01-15",
  "gioVao": "08:05:30",
  "trangThai": "DI_TRE",
  "khoangCach": 125.5,
  "message": "Chấm công thành công. Khoảng cách: 125.5m"
}
```

**Attendance Status Response:**
```json
{
  "hasCheckedIn": true,
  "hasCheckedOut": false,
  "chamCong": {
    "chamcongId": 456,
    "ngayCham": "2024-01-15",
    "gioVao": "08:05:30",
    "gioRa": null,
    "trangThai": "DI_TRE"
  }
}
```

### 📱 Mobile Integration - GPS Attendance

**GPS Attendance Flow:**

```
1. Check today's status
   GET /cham-cong/status/{nhanvienId}
   → Check if already checked in/out

2. Request location permission
   - Request GPS permission from user
   - Get current coordinates

3. Get GPS coordinates
   final position = await Geolocator.getCurrentPosition();
   double lat = position.latitude;
   double lng = position.longitude;

4. Send GPS check-in
   POST /cham-cong/gps
   Body: {
     "nhanvienId": 123,
     "latitude": lat,
     "longitude": lng,
     "diaChiCheckin": "Address string" // Optional
   }

5. Server validates
   - Calculate distance from company (GPSUtil)
   - Validate within 500m radius
   - Auto-determine status (late/on-time)
   - Calculate working hours on check-out
```

**Attendance Rules:**
```yaml
Standard Times:
  - Check-in: 08:00
  - Check-out: 17:00

Status Rules:
  - Late (DI_TRE): After 08:15
  - Early leave (VE_SOM): Before 17:00
  - On-time (DU_GIO): Within standards

GPS Validation:
  - Allowed radius: 500 meters
  - Company location: (21.0285, 105.8542)
  - Distance calculation: Haversine formula
```

**Error Handling:**
```
- Distance > 500m: "Bạn không ở trong phạm vi công ty"
- Already checked in: "Bạn đã chấm công hôm nay"
- GPS unavailable: "Không thể lấy vị trí GPS"
```

---

## 5. PROJECT - Agile/Scrum Management {#5-project}

### 📊 Entities

#### 1. Project
| Field | Type | Description |
|-------|------|-------------|
| projectId | Long | ID (PK) |
| name | String | Project name |
| keyProject | String | Project key (unique, e.g., PROJ-001) |
| description | String | Description |
| status | Enum | ACTIVE / ON_HOLD / OVERDUE / COMPLETED / CANCELLED |
| startDate | LocalDate | Start date |
| endDate | LocalDate | End date |
| createdBy | User | Creator |
| phongBan | PhongBan | Department |
| isActive | Boolean | Active status |
| createdAt | LocalDateTime | Created |
| updatedAt | LocalDateTime | Updated |

#### 2. Issue (Task)
| Field | Type | Description |
|-------|------|-------------|
| issueId | Long | ID (PK) |
| project | Project | Project |
| sprint | Sprint | Sprint (null = backlog) |
| issueKey | String | Issue key (unique, e.g., PROJ-001) |
| title | String | Title |
| description | String | Description |
| issueStatus | IssueStatus | Status (Todo, In Progress, Done...) |
| priority | Enum | LOW / MEDIUM / HIGH / CRITICAL |
| reporter | User | Reporter |
| assignee | User | Assignee |
| estimatedHours | BigDecimal | Estimated hours |
| actualHours | BigDecimal | Actual hours |
| dueDate | LocalDate | Deadline |
| createdAt | LocalDateTime | Created |
| updatedAt | LocalDateTime | Updated |

#### 3. Sprint
| Field | Type | Description |
|-------|------|-------------|
| sprintId | Long | ID (PK) |
| project | Project | Project |
| name | String | Sprint name (e.g., Sprint 1) |
| goal | String | Sprint goal |
| startDate | LocalDate | Start date |
| endDate | LocalDate | End date |
| status | Enum | PLANNING / ACTIVE / COMPLETED / CANCELLED |
| createdBy | User | Creator |
| createdAt | LocalDateTime | Created |
| updatedAt | LocalDateTime | Updated |

#### 4. ProjectMember
| Field | Type | Description |
|-------|------|-------------|
| id | Long | ID (PK) |
| project | Project | Project |
| user | User | User |
| role | Enum | OWNER / MANAGER / MEMBER |
| joinedAt | LocalDateTime | Joined date |

**Role Permissions:**
- `OWNER` - Full permissions
- `MANAGER` - Manage issues, sprints
- `MEMBER` - View, create issues

#### 5. IssueStatus
| Field | Type | Description |
|-------|------|-------------|
| statusId | Integer | ID (PK) |
| name | String | Status name (Todo, In Progress, Done...) |
| projectId | Long | Project (each project has own workflow) |
| orderIndex | Integer | Display order |

#### 6. IssueComment
| Field | Type | Description |
|-------|------|-------------|
| commentId | Long | ID (PK) |
| issue | Issue | Issue |
| user | User | Commenter |
| content | String | Content |
| createdAt | LocalDateTime | Created |
| updatedAt | LocalDateTime | Updated |

#### 7. IssueActivity (Activity Log)
| Field | Type | Description |
|-------|------|-------------|
| activityId | Long | ID (PK) |
| issue | Issue | Issue |
| user | User | User |
| activityType | String | CREATED / UPDATED / ASSIGNED / STATUS_CHANGED / COMMENTED |
| description | String | Activity description |
| createdAt | LocalDateTime | Created |

### 🔌 API Endpoints

#### `/api/projects` - Project Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects` | Create project |
| GET | `/api/projects` | Get all projects |
| GET | `/api/projects/{projectId}` | Get by ID |
| PUT | `/api/projects/{projectId}` | Update project |
| DELETE | `/api/projects/{projectId}` | Delete project |
| GET | `/api/projects/my-projects` | **My projects** |
| GET | `/api/projects/{projectId}/members` | Get project members |
| POST | `/api/projects/{projectId}/members` | **Add member** |
| DELETE | `/api/projects/{projectId}/members/{userId}` | **Remove member** |
| PUT | `/api/projects/{projectId}/members/{userId}/role` | **Change role** |
| GET | `/api/projects/{projectId}/files` | Get project files |
| POST | `/api/projects/{projectId}/files` | Upload file |
| DELETE | `/api/projects/{projectId}/files/{fileId}` | Delete file |

#### `/api/issues` - Issue Management (⭐ Critical for Mobile)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/issues` | Create issue |
| GET | `/api/issues/{issueId}` | Get by ID |
| PUT | `/api/issues/{issueId}` | Update issue |
| DELETE | `/api/issues/{issueId}` | Delete issue |
| GET | `/api/issues/project/{projectId}` | **Project's issues** |
| GET | `/api/issues/sprint/{sprintId}` | **Sprint's issues (Kanban)** |
| GET | `/api/issues/backlog/{projectId}` | **Project backlog** |
| GET | `/api/issues/assigned-to-me` | **My assigned tasks** |
| GET | `/api/issues/created-by-me` | My created issues |
| PATCH | `/api/issues/{issueId}/assign/{userId}` | **Assign to user** |
| PATCH | `/api/issues/{issueId}/status/{statusId}` | **Change status (Drag & Drop)** |
| PATCH | `/api/issues/{issueId}/priority` | Update priority |
| POST | `/api/issues/{issueId}/log-time` | Log working time |

#### `/api/sprints` - Sprint Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sprints` | Create sprint |
| GET | `/api/sprints/{sprintId}` | Get by ID |
| PUT | `/api/sprints/{sprintId}` | Update sprint |
| DELETE | `/api/sprints/{sprintId}` | Delete sprint |
| GET | `/api/sprints/project/{projectId}` | **Project's sprints** |
| GET | `/api/sprints/project/{projectId}/active` | **Active sprint** |
| PATCH | `/api/sprints/{sprintId}/start` | **Start sprint** |
| PATCH | `/api/sprints/{sprintId}/complete` | **Complete sprint** |
| POST | `/api/sprints/{sprintId}/issues/{issueId}` | **Add issue to sprint** |
| DELETE | `/api/sprints/{sprintId}/issues/{issueId}` | **Remove issue from sprint** |

#### `/api/comments` - Issue Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/comments` | **Create comment** |
| GET | `/api/comments/issue/{issueId}` | **Get issue comments** |
| GET | `/api/comments/project/{projectId}` | Get all project comments |
| PUT | `/api/comments/{commentId}` | Update comment |
| DELETE | `/api/comments/{commentId}` | Delete comment |

#### `/api/activities` - Issue Activities (Activity Log)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activities/issue/{issueId}` | **Issue history** |
| GET | `/api/activities/project/{projectId}` | All project activities |
| GET | `/api/activities/project/{projectId}/my` | **My activities** |
| DELETE | `/api/activities/{activityId}` | Delete activity |

#### `/api/project-dashboard` - Project Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/project-dashboard/project/{projectId}/stats` | **Project stats** |
| GET | `/api/project-dashboard/sprint/{sprintId}/burndown` | **Burndown chart** |
| GET | `/api/project-dashboard/my-projects` | **All my projects stats** |

### 📦 DTOs

**CreateProjectRequest:**
```json
{
  "name": "Enterprise Management System",
  "keyProject": "EMS",
  "description": "HR + Project Management System",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "phongbanId": 1
}
```

**CreateIssueRequest:**
```json
{
  "projectId": 1,
  "sprintId": null,
  "title": "Implement user authentication",
  "description": "Add login/logout functionality with JWT",
  "priority": "HIGH",
  "assigneeId": 5,
  "estimatedHours": 8.0,
  "dueDate": "2024-02-15"
}
```

**IssueDTO (Response):**
```json
{
  "issueId": 123,
  "issueKey": "EMS-001",
  "title": "Implement user authentication",
  "description": "Add login/logout functionality with JWT",
  "status": {
    "statusId": 1,
    "name": "Todo"
  },
  "priority": "HIGH",
  "reporter": {
    "userId": 1,
    "username": "admin"
  },
  "assignee": {
    "userId": 5,
    "username": "developer1"
  },
  "estimatedHours": 8.0,
  "actualHours": 0.0,
  "dueDate": "2024-02-15",
  "createdAt": "2024-01-15T10:00:00",
  "isOverdue": false
}
```

### 📱 Mobile Integration - Agile/Scrum Workflow

**Project Management Flow:**

```
1. View My Projects
   GET /api/projects/my-projects
   → Display list of projects user is member of

2. Select Project → View Details
   GET /api/projects/{projectId}
   GET /api/sprints/project/{projectId}
   → Show project info + list of sprints

3. View Active Sprint (Kanban Board)
   GET /api/sprints/project/{projectId}/active
   GET /api/issues/sprint/{sprintId}
   → Display Kanban board with columns by status

4. View Backlog
   GET /api/issues/backlog/{projectId}
   → List of issues not in any sprint

5. View My Tasks
   GET /api/issues/assigned-to-me
   → Personal task list across all projects

6. Update Issue Status (Drag & Drop)
   PATCH /api/issues/{issueId}/status/{statusId}
   → Update status when dragging card in Kanban

7. Assign Task
   PATCH /api/issues/{issueId}/assign/{userId}
   → Assign issue to team member

8. Add Comment
   POST /api/comments
   Body: { "issueId": 123, "content": "Working on it" }
```

**Sprint Board Layout:**
```
┌─────────────────────────────────────────┐
│  Sprint 1: Jan 15 - Jan 29              │
├───────────┬───────────┬─────────────────┤
│   Todo    │In Progress│      Done       │
├───────────┼───────────┼─────────────────┤
│ EMS-001   │ EMS-002   │    EMS-003      │
│ Priority  │ @user1    │    ✓            │
│ @user2    │ 2h/8h     │    8h/8h        │
└───────────┴───────────┴─────────────────┘
```

**UI Components Needed:**
- Project list screen
- Project detail screen (overview, sprints, backlog)
- Sprint Kanban board (drag & drop)
- Backlog screen (list view)
- Task detail screen (info, comments, activities)
- Task creation/edit form
- Member management screen

**Key Features for Mobile:**
- ⭐ Drag & drop Kanban board
- 🔔 Push notifications for task assignments
- 📊 Sprint burndown chart
- 💬 Comment threads on tasks
- 📋 Activity timeline
- 🏷️ Priority & status filters

---

## 6. CHAT - Real-time Messaging {#6-chat}

> [!TIP]
> **📱 Mobile Client Recommendation:**
> - **Nhận tin nhắn real-time:** Sử dụng **Firebase Firestore SDK** (xem [Firebase Integration Plan](file:///c:/DACN/docs/firebase_integration_plan.md))
> - **Gửi tin nhắn:** Sử dụng REST API `POST /api/chat/rooms/{roomId}/messages`
> - **Lấy lịch sử:** `GET /api/chat/rooms/{roomId}/messages` (backup/web admin)
> 
> API REST dưới đây vẫn hoạt động đầy đủ cho Web Admin và fallback.

### 📊 Entities

#### 1. ChatRoom
| Field | Type | Description |
|-------|------|-------------|
| roomId | Long | ID (PK) |
| name | String | Room name (nullable for DIRECT) |
| type | Enum | DIRECT / GROUP / PROJECT |
| project | Project | Project (nullable, only for PROJECT type) |
| avatarUrl | String | Room avatar |
| createdBy | User | Creator |
| createdAt | LocalDateTime | Created |

**RoomType:**
- `DIRECT` - 1-to-1 chat between 2 users
- `GROUP` - Group chat (multiple members)
- `PROJECT` - Project chat (auto-created with project)

#### 2. Message
| Field | Type | Description |
|-------|------|-------------|
| messageId | Long | ID (PK) |
| chatRoom | ChatRoom | Chat room |
| sender | User | Sender |
| content | String | Message content |
| messageType | Enum | TEXT / FILE / IMAGE |
| file | File | Attached file (nullable) |
| sentAt | LocalDateTime | Sent time |
| isDeleted | Boolean | Soft deleted |
| editedAt | LocalDateTime | Edited time |
| replyToMessage | Message | Reply to (nullable) |

**MessageType:**
- `TEXT` - Text message
- `FILE` - File attachment
- `IMAGE` - Image

#### 3. ChatRoomMember
| Field | Type | Description |
|-------|------|-------------|
| id | ChatRoomMemberId | Composite PK (roomId, userId) |
| chatRoom | ChatRoom | Chat room |
| user | User | User |
| role | Enum | ADMIN / MEMBER |
| joinedAt | LocalDateTime | Joined date |

**MemberRole:**
- `ADMIN` - Room admin (add/remove members, settings)
- `MEMBER` - Regular member

#### 4. MessageStatus
| Field | Type | Description |
|-------|------|-------------|
| id | MessageStatusId | Composite PK (messageId, userId) |
| message | Message | Message |
| user | User | User |
| status | Enum | DELIVERED / SEEN |
| timestamp | LocalDateTime | Timestamp |

**MessageStatusType:**
- `DELIVERED` - Delivered
- `SEEN` - Seen/Read

### 🔌 API Endpoints

#### `/api/chat/rooms` - Chat Room Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/rooms` | Create room (GROUP) |
| GET | `/api/chat/rooms` | **Get my rooms** |
| GET | `/api/chat/rooms/{roomId}` | Get room by ID |
| POST | `/api/chat/rooms/direct/{userId}` | **Find or create 1-1 chat** |
| GET | `/api/chat/rooms/project/{projectId}` | **Get project chat** |
| GET | `/api/chat/rooms/{roomId}/members` | Get members |
| POST | `/api/chat/rooms/{roomId}/members/{userId}` | Add member |
| DELETE | `/api/chat/rooms/{roomId}/members/{userId}` | Remove member |
| DELETE | `/api/chat/rooms/{roomId}/leave` | Leave room |
| PUT | `/api/chat/rooms/{roomId}/members/{userId}/role?role=ADMIN` | Change role |
| PUT | `/api/chat/rooms/{roomId}/settings` | Update settings |

#### `/api/chat/messages` - Message Management (⭐ Critical for Mobile)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/rooms/{roomId}/messages` | **Send message** |
| GET | `/api/chat/rooms/{roomId}/messages?page=0&size=50` | **Get messages (paginated)** |
| POST | `/api/chat/messages/{messageId}/seen` | **Mark as seen** |
| PUT | `/api/chat/messages/{messageId}` | Edit message |
| DELETE | `/api/chat/messages/{messageId}` | Delete (soft) |
| GET | `/api/chat/rooms/{roomId}/search?keyword=xxx` | Search messages |
| GET | `/api/chat/rooms/{roomId}/search/sender?senderKeyword=xxx` | Search by sender |
| GET | `/api/chat/rooms/{roomId}/search/date-range?startDate=...&endDate=...` | Search by date |
| GET | `/api/chat/rooms/{roomId}/search/type?messageType=IMAGE` | Filter by type |

#### `/api/chat/rooms/{roomId}/files` - File Upload (⭐ Important)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/rooms/{roomId}/files` | **Upload & send file** |
| POST | `/api/chat/rooms/{roomId}/images` | **Upload & send image** |
| GET | `/api/chat/rooms/{roomId}/files` | **Get room files** |
| GET | `/api/chat/rooms/{roomId}/images` | **Get room images** |

**File Upload (multipart/form-data):**
```
POST /api/chat/rooms/{roomId}/files
Content-Type: multipart/form-data

file: [binary]
content: "Here is the document" (optional caption)
```

#### `/api/chat/rooms/{roomId}/typing` - Typing Indicator

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/rooms/{roomId}/typing/start` | Start typing |
| POST | `/api/chat/rooms/{roomId}/typing/stop` | Stop typing |
| GET | `/api/chat/rooms/{roomId}/typing` | **Get typing users** |

**Typing Response:**
```json
{
  "typingUsers": ["user1", "user2"],
  "typingCount": 2,
  "isCurrentUserTyping": false
}
```

#### `/ api/chat/rooms/{roomId}/unread-count` - Message Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/rooms/{roomId}/unread-count` | **Get unread count** |

#### WebSocket Endpoints (Real-time) ⭐

| Protocol | Endpoint | Description |
|----------|----------|-------------|
| WS | `/ws` | **WebSocket connection** |
| SUBSCRIBE | `/topic/room/{roomId}` | Subscribe to room messages |
| SUBSCRIBE | `/user/queue/messages` | Subscribe to private notifications |
| SEND | `/app/chat.sendMessage` | Send message via WebSocket |
| SEND | `/app/chat.typing` | Send typing indicator |

### 📦 DTOs

**SendMessageRequest:**
```json
{
  "content": "Hello everyone!",
  "messageType": "TEXT",
  "replyToMessageId": null
}
```

**CreateChatRoomRequest:**
```json
{
  "name": "Team Discussion",
  "type": "GROUP",
  "memberUserIds": [2, 3, 4, 5],
  "projectId": null
}
```

**MessageDTO (Response):**
```json
{
  "messageId": 123,
  "chatRoomId": 5,
  "sender": {
    "userId": 1,
    "username": "admin",
    "avatarUrl": "..."
  },
  "content": "Hello everyone!",
  "messageType": "TEXT",
  "file": null,
  "sentAt": "2024-01-15T10:30:00",
  "isDeleted": false,
  "editedAt": null,
  "replyToMessage": null,
  "seenBy": [
    {
      "userId": 2,
      "seenAt": "2024-01-15T10:31:00"
    }
  ]
}
```

**ChatRoomDTO (Response):**
```json
{
  "roomId": 5,
  "name": "Team Discussion",
  "type": "GROUP",
  "avatarUrl": "...",
  "createdBy": {
    "userId": 1,
    "username": "admin"
  },
  "members": [
    {
      "userId": 1,
      "username": "admin",
      "role": "ADMIN"
    },
    {
      "userId": 2,
      "username": "user1",
      "role": "MEMBER"
    }
  ],
  "lastMessage": {
    "content": "Hello",
    "sentAt": "2024-01-15T10:30:00"
  },
  "unreadCount": 3,
  "createdAt": "2024-01-10T08:00:00"
}
```

### 📱 Mobile Integration - Real-time Chat

**WebSocket Setup (Flutter/Dart example):**

```dart
import 'package:stomp_dart_client/stomp_dart_client.dart';

class ChatService {
  StompClient? stompClient;
  
  void connect(String accessToken) {
    stompClient = StompClient(
      config: StompConfig(
        url: 'ws://localhost:8080/ws',
        onConnect: onConnect,
        webSocketConnectHeaders: {
          'Authorization': 'Bearer $accessToken'
        },
      ),
    );
    stompClient.activate();
  }
  
  void onConnect(StompFrame frame) {
    // Subscribe to room messages
    stompClient.subscribe(
      destination: '/topic/room/{roomId}',
      callback: (frame) {
        final message = jsonDecode(frame.body!);
        _handleNewMessage(message);
      },
    );
    
    // Subscribe to private notifications
    stompClient.subscribe(
      destination: '/user/queue/messages',
      callback: (frame) {
        // Handle notification
      },
    );
  }
  
  void sendMessage(int roomId, String content) {
    stompClient.send(
      destination: '/app/chat.sendMessage',
      body: jsonEncode({
        'roomId': roomId,
        'content': content,
        'messageType': 'TEXT'
      }),
    );
  }
}
```

**Chat Flow:**

```
1. Get Room List
   GET /api/chat/rooms
   → Display list with unread badges

2. Open Direct Chat (1-to-1)
   POST /api/chat/rooms/direct/{userId}
   → Find or create chat room
   → Navigate to chat screen

3. Connect WebSocket & Subscribe
   WS /ws
   SUBSCRIBE /topic/room/{roomId}
   → Receive real-time messages

4. Load Message History
   GET /api/chat/rooms/{roomId}/messages?page=0&size=50
   → Load 50 recent messages
   → Scroll up for pagination

5. Send Message
   Option 1 (REST): POST /api/chat/rooms/{roomId}/messages
   Option 2 (WebSocket): SEND /app/chat.sendMessage
   → Use WebSocket for real-time

6. Mark as Seen
   POST /api/chat/messages/{messageId}/seen
   → Update seen status

7. Typing Indicator
   SEND /app/chat.typing
   Body: { "roomId": 5, "isTyping": true }

8. Upload File/Image
   POST /api/chat/rooms/{roomId}/files
   → Multipart upload with optional caption
```

**UI Components:**
- Chat list screen (with unread badges)
- Chat conversation screen (messages)
- Message bubbles (text, image, file)
- Typing indicator
- Reply-to UI
- Search messages screen
- Image viewer
- File download handler

**Key Features:**
- ⭐ Real-time via WebSocket
- 💬 Text, image, file messages
- 📎 File attachments
- ✍️ Typing indicators
- ✅ Read receipts (seen status)
- 🔍 Message search
- 💬 Reply to messages
- ✏️ Edit/delete messages

---

## 6. CHAT - Real-time Messaging {#6-chat}

### 📊 Entities

#### 1. ChatRoom
| Field | Type | Description |
|-------|------|-------------|
| roomId | Long | ID (PK) |
| name | String | Room name (nullable for DIRECT) |
| type | Enum | DIRECT / GROUP / PROJECT |
| project | Project | Project (nullable, only for PROJECT type) |
| avatarUrl | String | Room avatar |
| createdBy | User | Creator |
| createdAt | LocalDateTime | Created |

**RoomType:**
- `DIRECT` - 1-to-1 chat between 2 users
- `GROUP` - Group chat (multiple members)
- `PROJECT` - Project chat (auto-created with project)

#### 2. Message
| Field | Type | Description |
|-------|------|-------------|
| messageId | Long | ID (PK) |
| chatRoom | ChatRoom | Chat room |
| sender | User | Sender |
| content | String | Message content |
| messageType | Enum | TEXT / FILE / IMAGE |
| file | File | Attached file (nullable) |
| sentAt | LocalDateTime | Sent time |
| isDeleted | Boolean | Soft deleted |
| editedAt | LocalDateTime | Edited time |
| replyToMessage | Message | Reply to (nullable) |

**MessageType:**
- `TEXT` - Text message
- `FILE` - File attachment
- `IMAGE` - Image

#### 3. ChatRoomMember
| Field | Type | Description |
|-------|------|-------------|
| id | ChatRoomMemberId | Composite PK (roomId, userId) |
| chatRoom | ChatRoom | Chat room |
| user | User | User |
| role | Enum | ADMIN / MEMBER |
| joinedAt | LocalDateTime | Joined date |

**MemberRole:**
- `ADMIN` - Room admin (add/remove members, settings)
- `MEMBER` - Regular member

#### 4. MessageStatus
| Field | Type | Description |
|-------|------|-------------|
| id | MessageStatusId | Composite PK (messageId, userId) |
| message | Message | Message |
| user | User | User |
| status | Enum | DELIVERED / SEEN |
| timestamp | LocalDateTime | Timestamp |

**MessageStatusType:**
- `DELIVERED` - Delivered
- `SEEN` - Seen/Read

### 🔌 API Endpoints

#### `/api/chat/rooms` - Chat Room Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/rooms` | Create room (GROUP) |
| GET | `/api/chat/rooms` | **Get my rooms** |
| GET | `/api/chat/rooms/{roomId}` | Get room by ID |
| POST | `/api/chat/rooms/direct/{userId}` | **Find or create 1-1 chat** |
| GET | `/api/chat/rooms/project/{projectId}` | **Get project chat** |
| GET | `/api/chat/rooms/{roomId}/members` | Get members |
| POST | `/api/chat/rooms/{roomId}/members/{userId}` | Add member |
| DELETE | `/api/chat/rooms/{roomId}/members/{userId}` | Remove member |
| DELETE | `/api/chat/rooms/{roomId}/leave` | Leave room |
| PUT | `/api/chat/rooms/{roomId}/members/{userId}/role?role=ADMIN` | Change role |
| PUT | `/api/chat/rooms/{roomId}/settings` | Update settings |

#### `/api/chat/messages` - Message Management (⭐ Critical for Mobile)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/rooms/{roomId}/messages` | **Send message** |
| GET | `/api/chat/rooms/{roomId}/messages?page=0&size=50` | **Get messages (paginated)** |
| POST | `/api/chat/messages/{messageId}/seen` | **Mark as seen** |
| PUT | `/api/chat/messages/{messageId}` | Edit message |
| DELETE | `/api/chat/messages/{messageId}` | Delete (soft) |
| GET | `/api/chat/rooms/{roomId}/search?keyword=xxx` | Search messages |
| GET | `/api/chat/rooms/{roomId}/search/sender?senderKeyword=xxx` | Search by sender |
| GET | `/api/chat/rooms/{roomId}/search/date-range?startDate=...&endDate=...` | Search by date |
| GET | `/api/chat/rooms/{roomId}/search/type?messageType=IMAGE` | Filter by type |

#### `/api/chat/rooms/{roomId}/files` - File Upload (⭐ Important)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/rooms/{roomId}/files` | **Upload & send file** |
| POST | `/api/chat/rooms/{roomId}/images` | **Upload & send image** |
| GET | `/api/chat/rooms/{roomId}/files` | **Get room files** |
| GET | `/api/chat/rooms/{roomId}/images` | **Get room images** |

**File Upload (multipart/form-data):**
```
POST /api/chat/rooms/{roomId}/files
Content-Type: multipart/form-data

file: [binary]
content: "Here is the document" (optional caption)
```

#### `/api/chat/rooms/{roomId}/typing` - Typing Indicator

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/rooms/{roomId}/typing/start` | Start typing |
| POST | `/api/chat/rooms/{roomId}/typing/stop` | Stop typing |
| GET | `/api/chat/rooms/{roomId}/typing` | **Get typing users** |

**Typing Response:**
```json
{
  "typingUsers": ["user1", "user2"],
  "typingCount": 2,
  "isCurrentUserTyping": false
}
```

#### `/api/chat/rooms/{roomId}/unread-count` - Message Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/rooms/{roomId}/unread-count` | **Get unread count** |

#### WebSocket Endpoints (Real-time) ⭐

| Protocol | Endpoint | Description |
|----------|----------|-------------|
| WS | `/ws` | **WebSocket connection** |
| SUBSCRIBE | `/topic/room/{roomId}` | Subscribe to room messages |
| SUBSCRIBE | `/user/queue/messages` | Subscribe to private notifications |
| SEND | `/app/chat.sendMessage` | Send message via WebSocket |
| SEND | `/app/chat.typing` | Send typing indicator |

### 📦 DTOs

**SendMessageRequest:**
```json
{
  "content": "Hello everyone!",
  "messageType": "TEXT",
  "replyToMessageId": null
}
```

**CreateChatRoomRequest:**
```json
{
  "name": "Team Discussion",
  "type": "GROUP",
  "memberUserIds": [2, 3, 4, 5],
  "projectId": null
}
```

**MessageDTO (Response):**
```json
{
  "messageId": 123,
  "chatRoomId": 5,
  "sender": {
    "userId": 1,
    "username": "admin",
    "avatarUrl": "..."
  },
  "content": "Hello everyone!",
  "messageType": "TEXT",
  "file": null,
  "sentAt": "2024-01-15T10:30:00",
  "isDeleted": false,
  "editedAt": null,
  "replyToMessage": null,
  "seenBy": [
    {
      "userId": 2,
      "seenAt": "2024-01-15T10:31:00"
    }
  ]
}
```

**ChatRoomDTO (Response):**
```json
{
  "roomId": 5,
  "name": "Team Discussion",
  "type": "GROUP",
  "avatarUrl": "...",
  "createdBy": {
    "userId": 1,
    "username": "admin"
  },
  "members": [
    {
      "userId": 1,
      "username": "admin",
      "role": "ADMIN"
    },
    {
      "userId": 2,
      "username": "user1",
      "role": "MEMBER"
    }
  ],
  "lastMessage": {
    "content": "Hello",
    "sentAt": "2024-01-15T10:30:00"
  },
  "unreadCount": 3,
  "createdAt": "2024-01-10T08:00:00"
}
```

### 📱 Mobile Integration - Real-time Chat

**WebSocket Setup (Flutter/Dart example):**

```dart
import 'package:stomp_dart_client/stomp_dart_client.dart';

class ChatService {
  StompClient? stompClient;
  
  void connect(String accessToken) {
    stompClient = StompClient(
      config: StompConfig(
        url: 'ws://localhost:8080/ws',
        onConnect: onConnect,
        webSocketConnectHeaders: {
          'Authorization': 'Bearer $accessToken'
        },
      ),
    );
    stompClient.activate();
  }
  
  void onConnect(StompFrame frame) {
    // Subscribe to room messages
    stompClient.subscribe(
      destination: '/topic/room/{roomId}',
      callback: (frame) {
        final message = jsonDecode(frame.body!);
        _handleNewMessage(message);
      },
    );
    
    // Subscribe to private notifications
    stompClient.subscribe(
      destination: '/user/queue/messages',
      callback: (frame) {
        // Handle notification
      },
    );
  }
  
  void sendMessage(int roomId, String content) {
    stompClient.send(
      destination: '/app/chat.sendMessage',
      body: jsonEncode({
        'roomId': roomId,
        'content': content,
        'messageType': 'TEXT'
      }),
    );
  }
}
```

**Chat Flow:**

```
1. Get Room List
   GET /api/chat/rooms
   → Display list with unread badges

2. Open Direct Chat (1-to-1)
   POST /api/chat/rooms/direct/{userId}
   → Find or create chat room
   → Navigate to chat screen

3. Connect WebSocket & Subscribe
   WS /ws
   SUBSCRIBE /topic/room/{roomId}
   → Receive real-time messages

4. Load Message History
   GET /api/chat/rooms/{roomId}/messages?page=0&size=50
   → Load 50 recent messages
   → Scroll up for pagination

5. Send Message
   Option 1 (REST): POST /api/chat/rooms/{roomId}/messages
   Option 2 (WebSocket): SEND /app/chat.sendMessage
   → Use WebSocket for real-time

6. Mark as Seen
   POST /api/chat/messages/{messageId}/seen
   → Update seen status

7. Typing Indicator
   SEND /app/chat.typing
   Body: { "roomId": 5, "isTyping": true }

8. Upload File/Image
   POST /api/chat/rooms/{roomId}/files
   → Multipart upload with optional caption
```

**UI Components:**
- Chat list screen (with unread badges)
- Chat conversation screen (messages)
- Message bubbles (text, image, file)
- Typing indicator
- Reply-to UI
- Search messages screen
- Image viewer
- File download handler

**Key Features:**
- ⭐ Real-time via WebSocket
- 💬 Text, image, file messages
- 📎 File attachments
- ✍️ Typing indicators
- ✅ Read receipts (seen status)
- 🔍 Message search
- 💬 Reply to messages
- ✏️ Edit/delete messages

#### `/api/chat` - Chat Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/me` | Get current user info for chat |
| GET | `/api/chat/health` | Chat service health check |

---

## 6.5. AI - Gemini AI Assistant {#6-5-ai}

### 📊 AI Assistant Features

AI-powered project assistant using Google Gemini API to help with:
- Project/Sprint summarization  
- Task prioritization suggestions
- Progress analysis
- Automated report generation
- Natural language chat interface

### 🔌 API Endpoints `/api/ai`

#### AI Chat & Quick Actions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai/status` | Check AI service status |
| POST | `/api/ai/chat` | **Chat with AI assistant** |
| POST | `/api/ai/project/{projectId}/summarize` | **Summarize project** |
| POST | `/api/ai/project/{projectId}/sprint/summarize` | Summarize current sprint |
| POST | `/api/ai/project/{projectId}/suggest-tasks` | **Suggest priority tasks** |
| POST | `/api/ai/project/{projectId}/analyze-progress` | Analyze project progress |
| POST | `/api/ai/project/{projectId}/generate-report` | Generate project report |

#### Conversation Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai/conversations?page=0&size=20` | Get my AI conversations |
| GET | `/api/ai/conversations/{conversationId}` | Get conversation detail |
| DELETE | `/api/ai/conversations/{conversationId}` | Delete conversation |
| GET | `/api/ai/help` | Get AI usage instructions |

#### AI Actions (Experimental)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/execute-action` | Execute single AI-suggested action |
| POST | `/api/ai/execute-batch` | Execute multiple actions at once |

### 📦 DTOs

**AI Chat Request:**
```json
{
  "message": "Summarize our current sprint progress",
  "conversationId": "conv-123" (optional),
  "projectId": 5 (optional context)
}
```

**AI Chat Response:**
```json
{
  "response": "Based on your current sprint...",
  "conversationId": "conv-123",
  "usage": {
    "promptTokens": 150,
    "completionTokens": 200,
    "totalTokens": 350
  }
}
```

**AI Action DTO:**
```json
{
  "action": "CREATE_TASK",
  "projectId": 5,
  "data": {
    "title": "Fix login bug",
    "priority": "HIGH",
    "assigneeId": 3
  }
}
```

### 📱 Mobile Integration

**AI Assistant Use Cases:**
1. Quick project summaries on mobile
2. Task prioritization recommendations
3. Progress check-ins
4. Automated status reports
5. Natural language queries

**Example Chat Flow:**
```
User: "What should I focus on today?"  
AI: "Based on your projects, I recommend..."

User: "Generate a report for Project Alpha"
AI: "I've generated a comprehensive report..."
```

---

## 7. STORAGE - File Management {#7-storage}

### 📊 Entities

#### 1. File
| Field | Type | Description |
|-------|------|-------------|
| fileId | Long | ID (PK) |
| filename | String | Stored filename |
| originalFilename | String | Original filename |
| filePath | String | File path on server |
| fileSize | Long | File size (bytes) |
| mimeType | String | MIME type |
| folder | Folder | Parent folder (nullable) |
| owner | User | File owner |
| version | Integer | Version number |
| parentFile | File | Parent file (for versioning) |
| uploadIp | String | Upload IP address |
| uploadUserAgent | String | User agent |
| createdAt | LocalDateTime | Created |
| updatedAt | LocalDateTime | Updated |
| isDeleted | Boolean | Soft deleted |

**Helper Methods:**
- `getFileExtension()` - Get file extension
- `getFileSizeFormatted()` - Format size (KB, MB, GB)
- `isImage()` - Check if image
- `isDocument()` - Check if document (PDF, Word, Excel)
- `isVideo()` - Check if video

#### 2. Folder
| Field | Type | Description |
|-------|------|-------------|
| folderId | Long | ID (PK) |
| name | String | Folder name |
| parentFolder | Folder | Parent folder (nullable) |
| owner | User | Folder owner |
| project | Project | Associated project (nullable) |
| createdAt | LocalDateTime | Created |
| updatedAt | LocalDateTime | Updated |

### 🔌 API Endpoints `/api/storage`

#### File Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/storage/upload` | **Upload file** |
| GET | `/api/storage/files/{fileId}` | Get file info |
| GET | `/api/storage/files/{fileId}/download` | **Download file** |
| GET | `/api/storage/my-files` | **Get my files** |
| GET | `/api/storage/folders/{folderId}/files` | Get folder files |
| DELETE | `/api/storage/files/{fileId}?permanent=false` | Delete file (soft/permanent) |
| GET | `/api/storage/stats` | **Get storage stats** |

#### Folder Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/storage/folders` | Create folder |
| GET | `/api/storage/folders/{folderId}` | Get folder |
| GET | `/api/storage/my-folders` | **Get my folders** |
| GET | `/api/storage/folders/{folderId}/subfolders` | Get subfolders |
| GET | `/api/storage/projects/{projectId}/folders` | Get project folders |
| PUT | `/api/storage/folders/{folderId}?name=xxx` | Update folder |
| DELETE | `/api/storage/folders/{folderId}` | Delete folder |

### 📦 DTOs

**File Upload Request (multipart/form-data):**
```
POST /api/storage/upload
Content-Type: multipart/form-data

file: [binary]
folderId: 123 (optional)
```

**Storage Stats Response:**
```json
{
  "totalFiles": 25,
  "totalSize": 104857600,
  "totalSizeFormatted": "100 MB",
  "storageQuota": 1073741824,
  "storageQuotaFormatted": "1 GB",
  "usedPercentage": 10.0,
  "remainingSize": 968884224,
  "remainingSizeFormatted": "900 MB"
}
```

**FileDTO (Response):**
```json
{
  "fileId": 123,
  "filename": "document_abc123.pdf",
  "originalFilename": "report.pdf",
  "fileSize": 2048576,
  "fileSizeFormatted": "2 MB",
  "mimeType": "application/pdf",
  "folder": {
    "folderId": 5,
    "name": "Documents"
  },
  "owner": {
    "userId": 1,
    "username": "user1"
  },
  "version": 1,
  "createdAt": "2024-01-15T10:00:00",
  "isImage": false,
  "isDocument": true,
  "isVideo": false
}
```

### 📱 Mobile Integration - File Management

**Upload Flow:**

```dart
Future<void> uploadFile(File file, {int? folderId}) async {
  var request = http.MultipartRequest(
    'POST',
    Uri.parse('$baseUrl/api/storage/upload'),
  );
  
  request.headers['Authorization'] = 'Bearer $accessToken';
  request.files.add(await http.MultipartFile.fromPath('file', file.path));
  
  if (folderId != null) {
    request.fields['folderId'] = folderId.toString();
  }
  
  var response = await request.send();
  if (response.statusCode == 200) {
    // Success
  }
}
```

**Download Flow:**

```dart
Future<void> downloadFile(int fileId, String filename) async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/storage/files/$fileId/download'),
    headers: {'Authorization': 'Bearer $accessToken'},
  );
  
  if (response.statusCode == 200) {
    final bytes = response.bodyBytes;
    final dir = await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/$filename');
    await file.writeAsBytes(bytes);
  }
}
```

**Storage Management:**
- Check storage stats before upload
- Show progress during upload/download
- Handle quota exceeded errors
- Organize files with folders
- Support file versioning

---

## 8. NOTIFICATION - Push Notifications {#8-notification}

### 📊 Entity: Notification

| Field | Type | Description |
|-------|------|-------------|
| notificationId | Long | ID (PK) |
| user | User | Recipient |
| type | String | Notification type |
| title | String | Title |
| content | String | Content |
| link | String | Deep link (nullable) |
| isRead | Boolean | Read status |
| createdAt | LocalDateTime | Created |

**Notification Types:**
- `NEW_MESSAGE` - New chat message
- `TASK_ASSIGNED` - Task assigned
- `TASK_UPDATED` - Task updated
- `COMMENT_ADDED` - New comment on task
- `COMMENT_MENTION` - Mentioned in comment (@username)
- `LEAVE_APPROVED` - Leave request approved
- `LEAVE_REJECTED` - Leave request rejected
- `SALARY_UPDATED` - Salary updated
- `ATTENDANCE_REMINDER` - Attendance reminder
- `PROJECT_UPDATE` - Project update
- `GENERAL` - General notification

### 🔌 API Endpoints `/api/notifications`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications?page=0&size=20` | **Get notifications (paginated)** |
| GET | `/api/notifications/unread-count` | **Get unread count** |
| PUT | `/api/notifications/{notificationId}/read` | **Mark as read** |
| PUT | `/api/notifications/mark-all-read` | Mark all as read |
| DELETE | `/api/notifications/{notificationId}` | Delete notification |

### 📦 DTOs

**Notification (Response):**
```json
{
  "notificationId": 123,
  "user": {
    "userId": 5,
    "username": "user1"
  },
  "type": "NEW_MESSAGE",
  "title": "New message",
  "content": "You have a new message from Admin",
  "link": "/chat/room/5",
  "isRead": false,
  "createdAt": "2024-01-15T10:30:00"
}
```

**Unread Count Response:**
```json
{
  "unreadCount": 5
}
```

### 📱 Mobile Integration - Push Notifications

**Notification Flow:**

```
1. App Launch - Get Unread Count
   GET /api/notifications/unread-count
   → Display badge on notification icon

2. Open Notification Screen
   GET /api/notifications?page=0&size=20
   → Display list with pagination

3. Click Notification
   PUT /api/notifications/{id}/read
   → Navigate to deep link
   → Refresh unread count

4. Pull to Refresh
   GET /api/notifications?page=0&size=20
   → Reload list

5. Mark All as Read
   PUT /api/notifications/mark-all-read
   → Update UI
```

**FCM Setup (Firebase Cloud Messaging):**

```dart
import 'package:firebase_messaging/firebase_messaging.dart';

class NotificationService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  
  Future<void> initialize() async {
    // Request permission
    await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    
    // Get FCM token
    String? token = await _fcm.getToken();
    if (token != null) {
      // Send to backend
      await _updateFCMToken(token);
    }
    
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((message) {
      _showLocalNotification(message);
      _refreshNotificationList();
    });
    
    // Handle notification tap (app in background)
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      _handleNotificationTap(message);
    });
  }
  
  Future<void> _updateFCMToken(String token) async {
    // POST /api/profile/fcm-token
    await http.post(
      Uri.parse('$baseUrl/api/profile/fcm-token'),
      headers: {'Authorization': 'Bearer $accessToken'},
      body: jsonEncode({'fcmToken': token}),
    );
  }
  
  void _handleNotificationTap(RemoteMessage message) {
    final link = message.data['link'];
    if (link != null) {
      // Navigate to deep link
      Navigator.pushNamed(context, link);
    }
  }
}
```

**Server-side FCM Payload:**
```json
{
  "notification": {
    "title": "New message",
    "body": "Admin: Hello everyone!",
    "click_action": "FLUTTER_NOTIFICATION_CLICK"
  },
  "data": {
    "type": "NEW_MESSAGE",
    "notificationId": "123",
    "link": "/chat/room/5",
    "chatRoomId": "5"
  }
}
```

**Push Notification Triggers:**
- New chat message received
- Task assigned/updated
- Comment mention (@username)
- Leave request approved/rejected
- System announcements

---

## 📊 Summary & Statistics

### ✅ Documentation Complete

**Total Modules Documented: 9**

1. ✅ **COMMON** - Configuration, Security, GPS Utils
2. ✅ **USER** - User Management (27 endpoints)
3. ✅ **AUTH** - Authentication (5 endpoints)
4. ✅ **HR** - Human Resources (105+ endpoints including Export & Salary Proposals)
5. ✅ **PROJECT** - Agile/Scrum (45+ endpoints)
6. ✅ **CHAT** - Real-time Messaging (42+ endpoints including Utilities)
7. ✅ **AI** - Gemini AI Assistant (15+ endpoints)
8. ✅ **STORAGE** - File Management (16 endpoints)
9. ✅ **NOTIFICATION** - Push Notifications (5 endpoints)

**Total API Endpoints: ~250+**

### 📱 Mobile Development Checklist

**Core Features:**
- ✅ JWT Authentication with refresh tokens
- ✅ GPS-based attendance (500m radius)
- ✅ Real-time chat via WebSocket
- ✅ Push notifications via FCM
- ✅ File upload/download
- ✅ Agile/Scrum Kanban board

**Key Integrations:**
1. **Authentication:** JWT + Refresh Token flow
2. **GPS:** Haversine distance calculation (500m radius)
3. **Real-time:** WebSocket with STOMP protocol
4. **Push:** Firebase Cloud Messaging (FCM)
5. **Files:** Multipart upload (10MB limit)

### 🔑 Important Endpoints Summary

**Most Critical for Mobile:**

```yaml
Authentication:
  - POST /api/auth/login
  - POST /api/auth/refresh
  - POST /api/profile/fcm-token

GPS Attendance:
  - POST /cham-cong/gps
  - GET /cham-cong/status/{nhanvienId}

Chat:
  - WS /ws (WebSocket)
  - GET /api/chat/rooms
  - POST /api/chat/rooms/{roomId}/messages

Project Management:
  - GET /api/projects/my-projects
  - GET /api/issues/assigned-to-me
  - GET /api/issues/sprint/{sprintId}
  - PATCH /api/issues/{issueId}/status/{statusId}

Notifications:
  - GET /api/notifications?page=0&size=20
  - GET /api/notifications/unread-count
```

### 🎯 Development Guidelines

**1. Error Handling**
- Always check HTTP status codes
- Parse error messages from `ErrorResponse`
- Show user-friendly Vietnamese messages

**2. Pagination**
- Default: `page=0`, `size=20`
- Implement pull-to-refresh
- Infinite scroll for lists

**3. Real-time Features**
- WebSocket for chat messages
- Polling for notifications (or FCM)
- Auto-reconnect on connection loss

**4. Security**
- Store accessToken in memory
- Store refreshToken in secure storage (Keychain/Keystore)
- Clear all tokens on logout

**5. GPS Accuracy**
- Request high-accuracy location
- Validate before sending to server
- Handle permission denial gracefully

### 📝 Next Steps for Mobile Team

1. **Setup Base Project**
   - Configure API client with interceptors
   - Setup secure storage for tokens
   - Configure FCM

2. **Implement Core Modules** (Priority order)
   - Phase 1: Authentication + Profile
   - Phase 2: GPS Attendance
   - Phase 3: Project Management (Kanban)
   - Phase 4: Chat (WebSocket)
   - Phase 5: Notifications

3. **Testing**
   - Unit tests for API services
   - Integration tests for flows
   - GPS accuracy testing on-site

4. **UI/UX**
   - Vietnamese language
   - Loading states
   - Error handling
   - Offline mode (cache)

---

## 📞 Support & Resources

**API Documentation:** This file (gemini_v2.md)  
**Base URL:** `http://localhost:8080`  
**WebSocket:** `ws://localhost:8080/ws`  
**File Upload Limit:** 10MB  
**GPS Accuracy Required:** Within 500m radius  

**Key Technologies:**
- Backend: Spring Boot + Java
- Database: MySQL
- Real-time: WebSocket (STOMP)
- Authentication: JWT
- File Storage: Local filesystem

---

**🎉 Documentation Complete - Ready for Mobile Development!**

*Last Updated: 2024-01-28*  
*Total Pages: ~1,400 lines*  
*API Endpoints: 220+*  
*Modules: 7*

## 7. NOTIFICATION - Thông báo {#7-notification}

### 📊 Entities

#### Notification
| Field | Type | Description |
|-------|------|-------------|
| notificationId | Long | ID (PK) |
| user | User | Recipient |
| title | String | Title |
| content | String | Content |
| type | Enum | SYSTEM / TASK / CHAT / LEAVE / PAYROLL |
| link | String | Deep link (nullable) |
| isRead | Boolean | Read status |
| createdAt | LocalDateTime | Created time |

### 🔌 API Endpoints `/api/notifications`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get my notifications (Paginated) |
| GET | `/api/notifications/unread-count` | **Get unread count** |
| PUT | `/api/notifications/{id}/read` | Mark as read |
| PUT | `/api/notifications/mark-all-read` | Mark all as read |
| DELETE | `/api/notifications/{id}` | Delete notification |

### 🔐 Security & Permissions Update

**Updated Access Rules:**
- `/nhan-vien/user/**`: Accessible by **EMPLOYEE**, MANAGER_HR, MANAGER_ACCOUNTING, MANAGER_PROJECT.
- `/api/projects/**`: Accessible by **EMPLOYEE**, MANAGER_PROJECT.
- `/api/issues/**`: Accessible by **EMPLOYEE**, MANAGER_PROJECT.
- `/api/chat/**`: Accessible by **EMPLOYEE**, MANAGER_HR, MANAGER_ACCOUNTING, MANAGER_PROJECT.
- `/api/notifications/**`: Accessible by **All Authenticated Users**.

**CORS Configuration:**
- Allowed Origins: `*` (All origins allowed for development)
- Allowed Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Allowed Headers: `*`

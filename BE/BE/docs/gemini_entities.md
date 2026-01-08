# Gemini Backend - Entity & Database Schema Documentation

## Quick Reference Guide

> Tài liệu liệt kê tất cả entities với tên cột database thực tế.

---

## 1. User Module

### Table: `users`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `userId` | `user_id` | Long | Primary key |
| `username` | `username` | String | Unique login name |
| `email` | `email` | String | Unique email |
| `phoneNumber` | `phone_number` | String | Phone number |
| `avatarUrl` | `avatar_url` | String | Avatar image URL |
| `isActive` | `is_active` | Boolean | Account active status |
| `isDeleted` | `is_deleted` | Boolean | Soft delete flag |
| `isSystemAdmin` | `is_system_admin` | Boolean | System-wide admin flag |
| `isOnline` | `is_online` | Boolean | Online presence |
| `lastSeen` | `last_seen` | LocalDateTime | Last activity |
| `presenceStatus` | `presence_status` | Enum | ONLINE, BUSY, OFFLINE |

---

## 2. Company Module

### Table: `companies`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `companyId` | `company_id` | Long | Primary key |
| `name` | `name` | String | Company name |
| `description` | `description` | String | Description |
| `logoUrl` | `logo_url` | String | Logo URL |
| `plan` | `plan` | Enum | FREE, BASIC, PRO |
| `isActive` | `is_active` | Boolean | Active status |

### Table: `company_members`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `id` | `id` | Long | Primary key |
| `user` | `user_id` | FK→User | Member user |
| `company` | `company_id` | FK→Company | Parent company |
| `role` | `role` | Enum | CompanyRole |
| `isActive` | `is_active` | Boolean | Membership active |
| `joinedAt` | `joined_at` | LocalDateTime | Join date |

---

## 3. HRM Module

### Table: `employees`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `employeeId` | `employee_id` | Long | Primary key |
| `user` | `user_id` | FK→User | Linked user |
| `company` | `company_id` | FK→Company | Tenant |
| `department` | `department_id` | FK→Department | Department |
| `position` | `position_id` | FK→Position | Position |
| `fullName` | `full_name` | String | Full name |
| `dateOfBirth` | `date_of_birth` | LocalDate | DOB |
| `gender` | `gender` | Enum | MALE, FEMALE |
| `idCard` | `id_card` | String | ID card number |
| `baseSalary` | `base_salary` | BigDecimal | Base salary |
| `status` | `status` | Enum | ACTIVE, INACTIVE |

### Table: `departments`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `departmentId` | `department_id` | Long | Primary key |
| `name` | `name` | String | Dept name |
| `description` | `description` | String | Description |
| `manager` | `manager_id` | FK→Employee | Manager |
| `company` | `company_id` | FK→Company | Tenant |

### Table: `positions`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `positionId` | `position_id` | Long | Primary key |
| `name` | `name` | String | Position name |
| `salaryCoefficient` | `salary_coefficient` | BigDecimal | Salary multiplier |
| `level` | `level` | Integer | Position level |
| `company` | `company_id` | FK→Company | Tenant |

### Table: `attendances`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `attendanceId` | `attendance_id` | Long | Primary key |
| `employee` | `employee_id` | FK→Employee | Employee |
| `attendanceDate` | `attendance_date` | LocalDate | Date |
| `checkInTime` | `check_in_time` | LocalTime | Check-in |
| `checkOutTime` | `check_out_time` | LocalTime | Check-out |
| `workingHours` | `working_hours` | BigDecimal | Hours worked |
| `status` | `status` | Enum | LATE, FULL_DAY |
| `company` | `company_id` | FK→Company | Tenant |

### Table: `leave_requests`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `leaveRequestId` | `leave_request_id` | Long | Primary key |
| `employee` | `employee_id` | FK→Employee | Requester |
| `leaveType` | `leave_type` | Enum | ANNUAL, SICK |
| `startDate` | `start_date` | LocalDate | Start |
| `endDate` | `end_date` | LocalDate | End |
| `status` | `status` | Enum | PENDING, APPROVED |
| `company` | `company_id` | FK→Company | Tenant |

### Table: `salaries`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `salaryId` | `salary_id` | Long | Primary key |
| `employee` | `employee_id` | FK→Employee | Employee |
| `year` | `year` | Integer | Year |
| `month` | `month` | Integer | Month |
| `baseSalary` | `base_salary` | BigDecimal | Base |
| `netSalary` | `net_salary` | BigDecimal | Net |
| `status` | `status` | Enum | PENDING, PAID |
| `company` | `company_id` | FK→Company | Tenant |

---

## 4. Project Module

### Table: `projects`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `projectId` | `project_id` | Long | Primary key |
| `keyProject` | `key_project` | String | Unique key |
| `name` | `name` | String | Project name |
| `description` | `description` | String | Description |
| `status` | `status` | Enum | ACTIVE, COMPLETED |
| `createdBy` | `created_by` | FK→User | Creator |
| `isActive` | `is_active` | Boolean | Active |
| `company` | `company_id` | FK→Company | Tenant |

### Table: `project_members`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `memberId` | `member_id` | Long | Primary key |
| `project` | `project_id` | FK→Project | Project |
| `user` | `user_id` | FK→User | Member |
| `role` | `role` | Enum | LEAD, MEMBER |

### Table: `issues`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `issueId` | `issue_id` | Long | Primary key |
| `issueKey` | `issue_key` | String | Unique key |
| `project` | `project_id` | FK→Project | Project |
| `assignee` | `assignee_id` | FK→User | Assignee |
| `reporter` | `reporter_id` | FK→User | Reporter |
| `sprint` | `sprint_id` | FK→Sprint | Sprint |
| `dueDate` | `due_date` | LocalDate | Due date |

### Table: `sprints`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `sprintId` | `sprint_id` | Long | Primary key |
| `project` | `project_id` | FK→Project | Project |
| `name` | `name` | String | Sprint name |
| `startDate` | `start_date` | LocalDate | Start |
| `endDate` | `end_date` | LocalDate | End |
| `status` | `status` | Enum | PLANNING, ACTIVE |

---

## 5. Chat Module

### Table: `chat_rooms`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `roomId` | `room_id` | Long | Primary key |
| `name` | `name` | String | Room name |
| `type` | `type` | Enum | PRIVATE, GROUP |
| `createdBy` | `created_by` | FK→User | Creator |
| `company` | `company_id` | FK→Company | Tenant |

### Table: `chat_room_members`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `id` | `id` | Long | Primary key |
| `chatRoom` | `room_id` | FK→ChatRoom | Room |
| `user` | `user_id` | FK→User | Member |
| `role` | `role` | Enum | ADMIN, MEMBER |

### Table: `messages`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `messageId` | `message_id` | Long | Primary key |
| `chatRoom` | `room_id` | FK→ChatRoom | Room |
| `sender` | `sender_id` | FK→User | Sender |
| `content` | `content` | String | Message text |
| `messageType` | `message_type` | Enum | TEXT, FILE |
| `isDeleted` | `is_deleted` | Boolean | Deleted flag |
| `createdAt` | `created_at` | LocalDateTime | Timestamp |

---

## 6. Notification Module

### Table: `notifications`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `notificationId` | `notification_id` | Long | Primary key |
| `user` | `user_id` | FK→User | Recipient |
| `type` | `type` | String | Notification type |
| `title` | `title` | String | Title |
| `content` | `content` | String | Content body |
| `isRead` | `is_read` | Boolean | Read status |
| `createdAt` | `created_at` | LocalDateTime | Timestamp |

---

## 7. Storage Module

### Table: `files`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `fileId` | `file_id` | Long | Primary key |
| `fileName` | `file_name` | String | Original name |
| `storagePath` | `storage_path` | String | Storage path |
| `owner` | `owner_id` | FK→User | Owner |
| `folder` | `folder_id` | FK→Folder | Parent folder |
| `isDeleted` | `is_deleted` | Boolean | Deleted flag |
| `company` | `company_id` | FK→Company | Tenant |

### Table: `folders`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `folderId` | `folder_id` | Long | Primary key |
| `name` | `name` | String | Folder name |
| `parentFolder` | `parent_folder_id` | FK→Folder | Parent |
| `owner` | `owner_id` | FK→User | Owner |
| `company` | `company_id` | FK→Company | Tenant |

---

## 8. Audit Module

### Table: `audit_logs`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `logId` | `log_id` | Long | Primary key |
| `actor` | `actor_id` | FK→User | Actor user |
| `action` | `action` | String | Action type |
| `entityType` | `entity_type` | String | Entity name |
| `entityId` | `entity_id` | Long | Entity ID |
| `severity` | `severity` | Enum | INFO, CRITICAL |
| `createdAt` | `created_at` | LocalDateTime | Timestamp |

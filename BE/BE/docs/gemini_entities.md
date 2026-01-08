# Gemini Backend - Entity & Data Structure Documentation

## Overview
This document describes all entities, DTOs, enums, and data structures in the system.

---

## 1. Core Module: User

### Entity: User
| Field | Type | Description |
|-------|------|-------------|
| `userId` | Long | Primary key |
| `username` | String | Unique login name |
| `email` | String | Unique email |
| `phoneNumber` | String | Phone number |
| `avatarUrl` | String | Avatar image URL |
| `isActive` | Boolean | Account active status |
| `isDeleted` | Boolean | Soft delete flag |
| `isSystemAdmin` | Boolean | System-wide admin flag |
| `isOnline` | Boolean | Online presence status |
| `lastSeen` | LocalDateTime | Last activity time |
| `lastLogin` | LocalDateTime | Last login time |
| `presenceStatus` | Enum | `ONLINE`, `BUSY`, `IN_MEETING`, `OFFLINE` |
| `status` | Enum | `ACTIVE`, `INACTIVE`, `PENDING_ACTIVATION` |

**Relationships:**
- `OneToMany` → `CompanyMember` (memberships)
- `OneToOne` → `Employee`

### Entity: RoleChangeRequest
| Field | Type | Description |
|-------|------|-------------|
| `id` | Long | Primary key |
| `user` | User | Requesting user |
| `company` | Company | Target company |
| `requestedRole` | CompanyRole | Desired role |
| `status` | Enum | `PENDING`, `APPROVED`, `REJECTED` |
| `createdAt` | LocalDateTime | Request time |

---

## 2. Core Module: Company

### Entity: Company
| Field | Type | Description |
|-------|------|-------------|
| `companyId` | Long | Primary key |
| `name` | String | Company name |
| `description` | String | Description |
| `logoUrl` | String | Logo image URL |
| `plan` | Enum | `FREE`, `BASIC`, `PRO`, `ENTERPRISE` |
| `isActive` | Boolean | Company active status |

**Relationships:**
- `OneToOne` → `CompanySettings`
- `OneToMany` → `CompanyMember`

### Entity: CompanyMember
| Field | Type | Description |
|-------|------|-------------|
| `id` | Long | Primary key |
| `user` | User | Member user |
| `company` | Company | Parent company |
| `role` | CompanyRole | Member role |
| `permissions` | UserPermissions | JSON permissions object |
| `isActive` | Boolean | Membership active |
| `joinedAt` | LocalDateTime | Join date |
| `invitedBy` | String | Inviter info |

### Enum: CompanyRole
| Value | Description |
|-------|-------------|
| `OWNER` | Company owner - highest privileges |
| `ADMIN` | Administrator - manage members & settings |
| `MANAGER_HR` | HR Manager |
| `MANAGER_ACCOUNTING` | Accounting Manager |
| `MANAGER_PROJECT` | Project Manager |
| `EMPLOYEE` | Regular employee |

### Entity: CompanySettings
| Field | Type | Description |
|-------|------|-------------|
| `id` | Long | Primary key |
| `company` | Company | Parent company |
| `enableHrModule` | Boolean | HR module toggle |
| `enableProjectModule` | Boolean | Project module toggle |
| `enableChatModule` | Boolean | Chat module toggle |
| `enableStorageModule` | Boolean | Storage module toggle |
| `maxEmployees` | Integer | Employee limit |
| `maxStorageMb` | Long | Storage quota in MB |

### Class: UserPermissions (JSON Stored)
| Field | Type | Description |
|-------|------|-------------|
| `canManageUsers` | Boolean | User management |
| `canManageProjects` | Boolean | Project management |
| `canViewReports` | Boolean | Report viewing |
| `canManageSettings` | Boolean | Settings management |

---

## 3. HRM Module

### Entity: Employee
| Field | Type | Description |
|-------|------|-------------|
| `employeeId` | Long | Primary key |
| `user` | User | Linked user account |
| `fullName` | String | Full name |
| `idCard` | String | ID card number (CCCD) |
| `dateOfBirth` | LocalDate | Birth date |
| `gender` | Enum | `MALE`, `FEMALE`, `OTHER` |
| `address` | String | Home address |
| `phone` | String | Phone number |
| `hireDate` | LocalDate | Employment start date |
| `status` | Enum | `ACTIVE`, `RESIGNED`, `ON_LEAVE` |
| `department` | Department | Department assignment |
| `position` | Position | Job position |
| `baseSalary` | BigDecimal | Base monthly salary |
| `allowance` | BigDecimal | Monthly allowance |

### Entity: Department
| Field | Type | Description |
|-------|------|-------------|
| `departmentId` | Long | Primary key |
| `name` | String | Department name |
| `description` | String | Description |
| `manager` | Employee | Department manager |

### Entity: Position
| Field | Type | Description |
|-------|------|-------------|
| `positionId` | Long | Primary key |
| `name` | String | Position title |
| `description` | String | Job description |
| `level` | Integer | Hierarchy level |

### Entity: Attendance
| Field | Type | Description |
|-------|------|-------------|
| `attendanceId` | Long | Primary key |
| `employee` | Employee | Employee |
| `date` | LocalDate | Work date |
| `checkIn` | LocalDateTime | Check-in time |
| `checkOut` | LocalDateTime | Check-out time |
| `status` | Enum | `PRESENT`, `ABSENT`, `LATE`, `EARLY_LEAVE`, `ON_LEAVE` |
| `workHours` | Double | Calculated work hours |
| `overtimeHours` | Double | Overtime hours |

### Entity: LeaveRequest
| Field | Type | Description |
|-------|------|-------------|
| `leaveRequestId` | Long | Primary key |
| `employee` | Employee | Requesting employee |
| `leaveType` | Enum | `ANNUAL`, `SICK`, `PERSONAL`, `MATERNITY`, `UNPAID` |
| `startDate` | LocalDate | Leave start |
| `endDate` | LocalDate | Leave end |
| `reason` | String | Leave reason |
| `status` | Enum | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` |
| `approvedBy` | User | Approver |
| `rejectedBy` | User | Rejector |
| `approvedAt` | LocalDateTime | Approval time |

### Entity: Salary
| Field | Type | Description |
|-------|------|-------------|
| `salaryId` | Long | Primary key |
| `employee` | Employee | Employee |
| `month` | Integer | Salary month (1-12) |
| `year` | Integer | Salary year |
| `baseSalary` | BigDecimal | Base salary |
| `allowance` | BigDecimal | Allowances |
| `bonus` | BigDecimal | Bonuses |
| `deductions` | BigDecimal | Deductions |
| `netSalary` | BigDecimal | Net payment |
| `status` | Enum | `DRAFT`, `PENDING`, `PAID` |
| `paidAt` | LocalDateTime | Payment date |

### Entity: Contract
| Field | Type | Description |
|-------|------|-------------|
| `contractId` | Long | Primary key |
| `employee` | Employee | Employee |
| `contractType` | Enum | `FULL_TIME`, `PART_TIME`, `INTERNSHIP`, `CONTRACTOR` |
| `startDate` | LocalDate | Contract start |
| `endDate` | LocalDate | Contract end |
| `salary` | BigDecimal | Contract salary |

### Entity: Review
| Field | Type | Description |
|-------|------|-------------|
| `reviewId` | Long | Primary key |
| `employee` | Employee | Reviewed employee |
| `reviewer` | User | Reviewer |
| `reviewDate` | LocalDate | Review date |
| `performanceScore` | Integer | Score (1-10) |
| `comments` | String | Review comments |
| `goals` | String | Next period goals |

---

## 4. Project Module

### Entity: Project
| Field | Type | Description |
|-------|------|-------------|
| `projectId` | Long | Primary key |
| `name` | String | Project name |
| `description` | String | Description |
| `key` | String | Short key (e.g., "PROJ") |
| `owner` | User | Project owner |
| `lead` | User | Project lead |
| `startDate` | LocalDate | Start date |
| `endDate` | LocalDate | Target end date |
| `status` | Enum | `PLANNING`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETED`, `CANCELLED` |

### Entity: ProjectMember
| Field | Type | Description |
|-------|------|-------------|
| `id` | Long | Primary key |
| `project` | Project | Parent project |
| `user` | User | Member user |
| `role` | Enum | `OWNER`, `ADMIN`, `MEMBER`, `VIEWER` |
| `joinedAt` | LocalDateTime | Join date |

### Entity: Sprint
| Field | Type | Description |
|-------|------|-------------|
| `sprintId` | Long | Primary key |
| `project` | Project | Parent project |
| `name` | String | Sprint name |
| `goal` | String | Sprint goal |
| `startDate` | LocalDate | Start date |
| `endDate` | LocalDate | End date |
| `status` | Enum | `PLANNING`, `ACTIVE`, `COMPLETED` |

### Entity: Issue
| Field | Type | Description |
|-------|------|-------------|
| `issueId` | Long | Primary key |
| `project` | Project | Parent project |
| `sprint` | Sprint | Assigned sprint (nullable) |
| `issueStatus` | IssueStatus | Current status |
| `reporter` | User | Issue creator |
| `assignee` | User | Assigned user |
| `title` | String | Issue title |
| `description` | String | Description |
| `issueType` | Enum | `TASK`, `BUG`, `STORY`, `EPIC` |
| `priority` | Enum | `LOWEST`, `LOW`, `MEDIUM`, `HIGH`, `HIGHEST` |
| `storyPoints` | Integer | Effort estimate |
| `dueDate` | LocalDate | Due date |

### Entity: IssueStatus
| Field | Type | Description |
|-------|------|-------------|
| `statusId` | Long | Primary key |
| `name` | String | Status name |
| `category` | Enum | `TO_DO`, `IN_PROGRESS`, `DONE` |
| `orderIndex` | Integer | Display order |

### Entity: IssueComment
| Field | Type | Description |
|-------|------|-------------|
| `commentId` | Long | Primary key |
| `issue` | Issue | Parent issue |
| `user` | User | Author |
| `content` | String | Comment text |
| `createdAt` | LocalDateTime | Created time |

### Entity: IssueActivity
| Field | Type | Description |
|-------|------|-------------|
| `activityId` | Long | Primary key |
| `issue` | Issue | Parent issue |
| `user` | User | Actor |
| `action` | Enum | `CREATED`, `UPDATED`, `STATUS_CHANGED`, etc. |
| `oldValue` | String | Previous value |
| `newValue` | String | New value |
| `createdAt` | LocalDateTime | Activity time |

### Entity: ProjectPhase
| Field | Type | Description |
|-------|------|-------------|
| `phaseId` | Long | Primary key |
| `project` | Project | Parent project |
| `name` | String | Phase name |
| `startDate` | LocalDate | Start date |
| `endDate` | LocalDate | End date |
| `progress` | Integer | Completion percentage |

---

## 5. Chat Module

### Entity: ChatRoom
| Field | Type | Description |
|-------|------|-------------|
| `chatRoomId` | Long | Primary key |
| `name` | String | Room name |
| `type` | Enum | `DIRECT`, `GROUP`, `PROJECT` |
| `project` | Project | Linked project (if PROJECT type) |
| `isActive` | Boolean | Room active |

### Entity: ChatRoomMember
| Field | Type | Description |
|-------|------|-------------|
| `chatRoom` | ChatRoom | Room |
| `user` | User | Member |
| `role` | Enum | `ADMIN`, `MEMBER` |
| `joinedAt` | LocalDateTime | Join date |

### Entity: Message
| Field | Type | Description |
|-------|------|-------------|
| `messageId` | Long | Primary key |
| `chatRoom` | ChatRoom | Parent room |
| `sender` | User | Sender |
| `content` | String | Message content |
| `messageType` | Enum | `TEXT`, `IMAGE`, `FILE`, `SYSTEM` |
| `replyTo` | Message | Reply reference |
| `isEdited` | Boolean | Edit flag |
| `isDeleted` | Boolean | Delete flag |
| `createdAt` | LocalDateTime | Send time |

### Entity: MessageReaction
| Field | Type | Description |
|-------|------|-------------|
| `reactionId` | Long | Primary key |
| `message` | Message | Parent message |
| `user` | User | Reactor |
| `emoji` | String | Reaction emoji |

### Entity: Meeting
| Field | Type | Description |
|-------|------|-------------|
| `meetingId` | Long | Primary key |
| `chatRoom` | ChatRoom | Associated room |
| `title` | String | Meeting title |
| `scheduledStart` | LocalDateTime | Scheduled start |
| `scheduledEnd` | LocalDateTime | Scheduled end |
| `status` | Enum | `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |

---

## 6. Storage Module

### Entity: Folder
| Field | Type | Description |
|-------|------|-------------|
| `folderId` | Long | Primary key |
| `name` | String | Folder name |
| `parentFolder` | Folder | Parent folder |
| `owner` | User | Owner |
| `project` | Project | Linked project |

### Entity: File
| Field | Type | Description |
|-------|------|-------------|
| `fileId` | Long | Primary key |
| `filename` | String | System filename |
| `originalFilename` | String | Original name |
| `filePath` | String | Storage path |
| `fileSize` | Long | Size in bytes |
| `mimeType` | String | MIME type |
| `folder` | Folder | Parent folder |
| `owner` | User | Uploader |
| `version` | Integer | File version |
| `isPublic` | Boolean | Public access flag |
| `isDeleted` | Boolean | Soft delete flag |

---

## 7. Other Modules

### Entity: Notification
| Field | Type | Description |
|-------|------|-------------|
| `notificationId` | Long | Primary key |
| `recipient` | User | Target user |
| `title` | String | Notification title |
| `message` | String | Notification body |
| `type` | NotificationType | Notification type |
| `priority` | Enum | `LOW`, `NORMAL`, `HIGH`, `URGENT` |
| `isRead` | Boolean | Read status |
| `link` | String | Action link |

### Entity: AuditLog
| Field | Type | Description |
|-------|------|-------------|
| `auditLogId` | Long | Primary key |
| `actor` | User | Acting user |
| `action` | String | Action performed |
| `entityType` | String | Target entity type |
| `entityId` | Long | Target entity ID |
| `oldValue` | String | Previous value (JSON) |
| `newValue` | String | New value (JSON) |
| `ipAddress` | String | Client IP |
| `userAgent` | String | Client user agent |
| `createdAt` | LocalDateTime | Action time |

### Entity: RefreshToken
| Field | Type | Description |
|-------|------|-------------|
| `tokenId` | Long | Primary key |
| `user` | User | Token owner |
| `token` | String | Token value |
| `expiryDate` | LocalDateTime | Expiration |
| `isRevoked` | Boolean | Revocation status |

### Entity: UserSession
| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | Long | Primary key |
| `user` | User | Session owner |
| `token` | String | Session token |
| `ipAddress` | String | Client IP |
| `userAgent` | String | Browser info |
| `lastActivity` | LocalDateTime | Last activity |
| `isActive` | Boolean | Active status |

---

## Multi-Tenancy Architecture

All business entities extend `TenantScopedEntity`:
- Contains `company` field linking to parent Company
- Automatic tenant filtering via Hibernate `@Filter`
- Ensures data isolation between companies

**Tenant-Scoped Entities:**
- Employee, Department, Position
- Attendance, LeaveRequest, Salary, Contract, Review
- Project, Sprint, Issue, IssueStatus
- ChatRoom, Message
- File, Folder
- Notification

**Global Entities (No Tenant):**
- User, CompanyMember
- AuditLog
- RefreshToken, UserSession

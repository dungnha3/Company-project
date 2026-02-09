# Gemini Backend - Entity & Database Schema Documentation

## Quick Reference Guide

> Tài liệu liệt kê tất cả entities với tên cột database thực tế.
> **Updated: 2026-02-09** - Added Integration, PersonalTask, CustomField, IssueDependency entities

---

## 1. User Module

### Table: `users`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `userId` | `user_id` | Long | Primary key |
| `username` | `username` | String | Unique login name |
| `email` | `email` | String | Unique email |
| `phoneNumber` | `phone_number` | String | Phone number |
| `avatarUrl` | `avatar_data` | String | Avatar image URL |
| `isActive` | `is_active` | Boolean | Account active status |
| `isDeleted` | `is_deleted` | Boolean | Soft delete flag |
| `isSystemAdmin` | `is_system_admin` | Boolean | System-wide admin flag |
| `isOnline` | `is_online` | Boolean | Online presence |
| `lastSeen` | `last_seen` | LocalDateTime | Last activity |
| `presenceStatus` | `presence_status` | Enum | ONLINE, BUSY, OFFLINE |
| `personalPlan` | `personal_plan` | Enum | FREE, STARTER, PROFESSIONAL, ENTERPRISE |

### Table: `personal_workspaces`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `workspaceId` | `workspace_id` | Long | Primary key |
| `user` | `user_id` | FK→User (UNIQUE) | Owner user |
| `name` | `name` | String | Workspace name |
| `createdAt` | `created_at` | LocalDateTime | Creation time |

---

## 2. Company Module

### Table: `companies`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `companyId` | `company_id` | Long | Primary key |
| `name` | `name` | String | Company name |
| `description` | `description` | String | Description |
| `slug` | `slug` | String | URL path |
| `logoUrl` | `logo_url` | String | Logo URL |
| `address` | `address` | String | Address |
| `phone` | `phone` | String | Phone |
| `email` | `email` | String | Email |
| `plan` | `subscription_plan` | Enum | FREE, STARTER, PROFESSIONAL, ENTERPRISE |
| `isActive` | `is_active` | Boolean | Active status |

### Table: `company_settings`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `companyId` | `company_id` | Long | Primary key (FK→Company) |
| `hrModuleEnabled` | `hr_module_enabled` | Boolean | HR module toggle |
| `projectModuleEnabled` | `project_module_enabled` | Boolean | Project module toggle |
| `chatModuleEnabled` | `chat_module_enabled` | Boolean | Chat module toggle |
| `storageModuleEnabled` | `storage_module_enabled` | Boolean | Storage module toggle |
| `aiModuleEnabled` | `ai_module_enabled` | Boolean | AI module toggle |
| `webhookEnabled` | `webhook_enabled` | Boolean | Webhook integration toggle |
| `attendanceEnabled` | `attendance_enabled` | Boolean | Attendance sub-feature |
| `leaveEnabled` | `leave_enabled` | Boolean | Leave sub-feature |
| `salaryEnabled` | `salary_enabled` | Boolean | Salary sub-feature |
| `contractEnabled` | `contract_enabled` | Boolean | Contract sub-feature |
| `reviewEnabled` | `review_enabled` | Boolean | Review sub-feature |
| `okrEnabled` | `okr_enabled` | Boolean | OKR feature |
| `skillsMatrixEnabled` | `skills_matrix_enabled` | Boolean | Skills matrix feature |
| `onboardingEnabled` | `onboarding_enabled` | Boolean | Onboarding feature |
| `resourcePlanningEnabled` | `resource_planning_enabled` | Boolean | Resource planning feature |
| `orgChartEnabled` | `org_chart_enabled` | Boolean | Org chart feature |
| `timeTrackingEnabled` | `time_tracking_enabled` | Boolean | Time tracking sub-feature |
| `analyticsEnabled` | `analytics_enabled` | Boolean | Analytics sub-feature |
| `calendarEnabled` | `calendar_enabled` | Boolean | Calendar sub-feature |
| `chatReactionsEnabled` | `chat_reactions_enabled` | Boolean | Chat reactions toggle |
| `chatFileShareEnabled` | `chat_file_share_enabled` | Boolean | Chat file sharing toggle |
| `chatThreadsEnabled` | `chat_threads_enabled` | Boolean | Chat threads toggle |
| `chatSearchEnabled` | `chat_search_enabled` | Boolean | Chat search toggle |
| `maxEmployees` | `max_employees` | Integer | Max employees limit |
| `maxProjects` | `max_projects` | Integer | Max projects limit |
| `maxStorageBytes` | `max_storage_bytes` | Long | Max storage in bytes |
| `maxFileUploadBytes` | `max_file_upload_bytes` | Long | Max file upload size |
| `allowedRadius` | `allowed_radius` | Double | GPS check-in radius (meters) |
| `officeLatitude` | `office_latitude` | Double | Office GPS latitude |
| `officeLongitude` | `office_longitude` | Double | Office GPS longitude |
| `userStorageQuotaBytes` | `user_storage_quota_bytes` | Long | Per-user storage quota |
| `maxLeaveDaysPerYear` | `max_leave_days_per_year` | Integer | Annual leave limit |

### Table: `company_members`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `id` | `id` | Long | Primary key |
| `user` | `user_id` | FK→User | Member user |
| `company` | `company_id` | FK→Company | Parent company |
| `permissions` | `permissions` | JSON/String | Granular user permissions |
| `isActive` | `is_active` | Boolean | Membership active |
| `joinedAt` | `joined_at` | LocalDateTime | Join date |

### Table: `company_member_roles`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `member` | `member_id` | FK→CompanyMember | Parent member |
| `role` | `role` | Enum | OWNER, ADMIN, MANAGER_HR, MANAGER_PROJECT, MANAGER_ACCOUNTING, EMPLOYEE |

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
| `gender` | `gender` | Enum | MALE, FEMALE, OTHER |
| `idCard` | `id_card` | String | ID card number |
| `address` | `address` | String | Address |
| `phone` | `phone` | String | Phone |
| `hireDate` | `hire_date` | LocalDate | Hire date |
| `baseSalary` | `base_salary` | BigDecimal | Base salary |
| `allowance` | `allowance` | BigDecimal | Allowance |
| `status` | `status` | Enum | ACTIVE, RESIGNED, ON_LEAVE |

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
| `description` | `description` | String | Description |
| `icon` | `icon` | String | Icon |
| `salaryCoefficient` | `salary_coefficient` | Double | Salary multiplier |
| `level` | `level` | Integer | Position level |

### Table: `attendances`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `attendanceId` | `attendance_id` | Long | Primary key |
| `employee` | `employee_id` | FK→Employee | Employee |
| `company` | `company_id` | FK→Company | Tenant |
| `attendanceDate` | `attendance_date` | LocalDate | Date |
| `checkInTime` | `check_in_time` | LocalTime | Check-in |
| `checkOutTime` | `check_out_time` | LocalTime | Check-out |
| `workingHours` | `working_hours` | BigDecimal | Hours worked |
| `status` | `status` | Enum | LATE, EARLY_LEAVE, FULL_DAY, ON_LEAVE, ABSENT |
| `note` | `note` | String | Note |
| `latitude` | `latitude` | Double | GPS lat |
| `longitude` | `longitude` | Double | GPS lng |
| `checkInAddress` | `check_in_address` | String | Address |
| `distance` | `distance` | Double | Distance from office |
| `checkInMethod` | `check_in_method` | Enum | GPS, MANUAL, QR_CODE, FACE_ID |
| `shiftType` | `shift_type` | Enum | MORNING, AFTERNOON, EVENING, FULL |

### Table: `leave_requests`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `leaveRequestId` | `leave_request_id` | Long | Primary key |
| `employee` | `employee_id` | FK→Employee | Requester |
| `company` | `company_id` | FK→Company | Tenant |
| `leaveType` | `leave_type` | Enum | ANNUAL, SICK, UNPAID, OTHER |
| `startDate` | `start_date` | LocalDate | Start |
| `endDate` | `end_date` | LocalDate | End |
| `totalDays` | `total_days` | Integer | Calculated |
| `reason` | `reason` | String | Reason |
| `status` | `status` | Enum | PENDING, PM_APPROVED, APPROVED, REJECTED |

### Table: `salaries`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `salaryId` | `salary_id` | Long | Primary key |
| `employee` | `employee_id` | FK→Employee | Employee |
| `company` | `company_id` | FK→Company | Tenant |
| `year` | `year` | Integer | Year |
| `month` | `month` | Integer | Month |
| `baseSalary` | `base_salary` | BigDecimal | Base salary |
| `workingDays` | `working_days` | Integer | Actual days |
| `standardWorkingDays` | `standard_working_days` | Integer | Standard (26) |
| `proratedSalary` | `prorated_salary` | BigDecimal | Prorated |
| `allowance` | `allowance` | BigDecimal | Allowance |
| `bonus` | `bonus` | BigDecimal | Bonus |
| `overtimeHours` | `overtime_hours` | Integer | OT hours |
| `overtimePay` | `overtime_pay` | BigDecimal | OT pay |
| `socialInsurance` | `social_insurance` | BigDecimal | 8% |
| `healthInsurance` | `health_insurance` | BigDecimal | 1.5% |
| `unemploymentInsurance` | `unemployment_insurance` | BigDecimal | 1% |
| `personalIncomeTax` | `personal_income_tax` | BigDecimal | Tax |
| `otherDeductions` | `other_deductions` | BigDecimal | Other |
| `grossSalary` | `gross_salary` | BigDecimal | Gross |
| `totalDeductions` | `total_deductions` | BigDecimal | Total deductions |
| `netSalary` | `net_salary` | BigDecimal | Net |
| `paymentStatus` | `payment_status` | Enum | UNPAID, PAID, CANCELLED |
| `note` | `note` | String | Note |

### Table: `contracts`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `contractId` | `contract_id` | Long | Primary key |
| `employee` | `employee_id` | FK→Employee | Employee |
| `company` | `company_id` | FK→Company | Tenant (from TenantScopedEntity) |
| `contractType` | `contract_type` | Enum | PROBATION, FIXED_TERM, INDEFINITE |
| `startDate` | `start_date` | LocalDate | Start date |
| `endDate` | `end_date` | LocalDate | End date |
| `salary` | `salary` | BigDecimal | Salary amount |
| `content` | `content` | String | Contract content |
| `status` | `status` | Enum | ACTIVE, EXPIRED, CANCELLED |

### Table: `reviews`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `reviewId` | `review_id` | Long | Primary key |
| `employee` | `employee_id` | FK→Employee | Employee being reviewed |
| `reviewer` | `reviewer_id` | FK→Employee | Reviewer |
| `reviewPeriod` | `review_period` | String | Q1-2024, Q2-2024 |
| `reviewType` | `review_type` | Enum | QUARTERLY, ANNUAL, PROBATION, PROMOTION |
| `technicalScore` | `technical_score` | BigDecimal | 0.0-10.0 |
| `attitudeScore` | `attitude_score` | BigDecimal | 0.0-10.0 |
| `softSkillsScore` | `soft_skills_score` | BigDecimal | 0.0-10.0 |
| `teamworkScore` | `teamwork_score` | BigDecimal | 0.0-10.0 |
| `totalScore` | `total_score` | BigDecimal | Calculated |
| `rating` | `rating` | Enum | EXCELLENT, GOOD, SATISFACTORY, AVERAGE, POOR |
| `comments` | `comments` | String | Feedback comments |
| `nextGoals` | `next_goals` | String | Goals for next period |
| `status` | `status` | Enum | IN_PROGRESS, PENDING, APPROVED, REJECTED |

---

## 4. Project Module

### Table: `projects`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `projectId` | `project_id` | Long | Primary key |
| `keyProject` | `key_project` | String | Unique key (HRMS, CRM) |
| `name` | `name` | String | Project name |
| `description` | `description` | String | Description |
| `status` | `status` | Enum | ACTIVE, ON_HOLD, OVERDUE, COMPLETED, CANCELLED |
| `startDate` | `start_date` | LocalDate | Start date |
| `endDate` | `end_date` | LocalDate | End date |
| `budget` | `budget` | BigDecimal | Budget |
| `createdBy` | `created_by` | FK→User | Creator |
| `department` | `department_id` | FK→Department | Dept |
| `isActive` | `is_active` | Boolean | Active |
| `company` | `company_id` | FK→Company | Tenant |

### Table: `project_members`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `id` | `id` | Long | Primary key |
| `project` | `project_id` | FK→Project | Project |
| `user` | `user_id` | FK→User | Member |
| `role` | `role` | Enum | OWNER, MANAGER, MEMBER |

### Table: `sprints`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `sprintId` | `sprint_id` | Long | Primary key |
| `project` | `project_id` | FK→Project | Project |
| `name` | `name` | String | Sprint name |
| `goal` | `goal` | String | Goal |
| `startDate` | `start_date` | LocalDate | Start |
| `endDate` | `end_date` | LocalDate | End |
| `status` | `status` | Enum | PLANNING, ACTIVE, COMPLETED, CANCELLED |
| `createdBy` | `created_by` | FK→User | Creator |

### Table: `issue_statuses` (GLOBAL - not per project)
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `statusId` | `status_id` | Integer | Primary key |
| `name` | `name` | String | To Do, In Progress, Done |
| `orderIndex` | `order_index` | Integer | Display order |
| `color` | `color` | String | Hex color (#4BADE8) |

### Table: `issues`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `issueId` | `issue_id` | Long | Primary key |
| `issueKey` | `issue_key` | String | Unique key (HRMS-1) |
| `project` | `project_id` | FK→Project | Project |
| `sprint` | `sprint_id` | FK→Sprint | Sprint (nullable) |
| `phase` | `phase_id` | FK→Phase | Phase |
| `title` | `title` | String | Title |
| `description` | `description` | String | Description |
| `issueStatus` | `status_id` | FK→IssueStatus | Status |
| `priority` | `priority` | Enum | LOW, MEDIUM, HIGH, CRITICAL |
| `reporter` | `reporter_id` | FK→User | Reporter |
| `assignee` | `assignee_id` | FK→User | Assignee |
| `estimatedHours` | `estimated_hours` | BigDecimal | Estimate |
| `actualHours` | `actual_hours` | BigDecimal | Actual |
| `dueDate` | `due_date` | LocalDate | Due date |

### Table: `project_phases`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `phaseId` | `phase_id` | Long | Primary key |
| `project` | `project_id` | FK→Project | Project |
| `name` | `name` | String | Phase name |
| `description` | `description` | String | Description |
| `startDate` | `start_date` | LocalDate | Start date |
| `endDate` | `end_date` | LocalDate | End date |
| `status` | `status` | Enum | PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD |
| `orderIndex` | `order_index` | Integer | Display order |
| `createdBy` | `created_by` | FK→User | Creator |

### Table: `issue_activities`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `activityId` | `activity_id` | Long | Primary key |
| `issue` | `issue_id` | FK→Issue | Issue |
| `user` | `user_id` | FK→User | Who made change |
| `activityType` | `activity_type` | Enum | CREATED, STATUS_CHANGED, ASSIGNEE_CHANGED, etc |
| `fieldName` | `field_name` | String | Changed field |
| `oldValue` | `old_value` | String | Previous value |
| `newValue` | `new_value` | String | New value |
| `description` | `description` | String | Auto-generated description |
| `createdAt` | `created_at` | LocalDateTime | Timestamp |

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

## 9. Time Tracking Module

### Table: `time_logs`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `logId` | `log_id` | Long | Primary key |
| `issue` | `issue_id` | FK→Issue | Linked issue |
| `user` | `user_id` | FK→User | Who logged |
| `company` | `company_id` | FK→Company | Tenant |
| `loggedHours` | `logged_hours` | BigDecimal | Hours worked |
| `workDate` | `work_date` | LocalDate | Work date |
| `description` | `description` | String | Description |
| `createdAt` | `created_at` | LocalDateTime | Created |
| `updatedAt` | `updated_at` | LocalDateTime | Updated |

---

## 10. Calendar Module

### Table: `calendar_events`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `eventId` | `event_id` | Long | Primary key |
| `title` | `title` | String | Event title |
| `description` | `description` | String | Description |
| `startTime` | `start_time` | LocalDateTime | Start time |
| `endTime` | `end_time` | LocalDateTime | End time |
| `allDay` | `all_day` | Boolean | All day event |
| `eventType` | `event_type` | Enum | MEETING, DEADLINE, REMINDER, HOLIDAY, OTHER |
| `location` | `location` | String | Location |
| `meetingLink` | `meeting_link` | String | Meeting URL |
| `recurrenceRule` | `recurrence_rule` | String | RRULE format |
| `createdBy` | `created_by` | FK→User | Creator |
| `project` | `project_id` | FK→Project | Project link |
| `issue` | `issue_id` | FK→Issue | Issue link |
| `company` | `company_id` | FK→Company | Tenant |
| `createdAt` | `created_at` | LocalDateTime | Created |
| `updatedAt` | `updated_at` | LocalDateTime | Updated |

### Table: `event_attendees`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `id` | `id` | Long | Primary key |
| `event` | `event_id` | FK→CalendarEvent | Event |
| `user` | `user_id` | FK→User | Attendee |
| `responseStatus` | `response_status` | Enum | PENDING, ACCEPTED, DECLINED, TENTATIVE |

---

## 11. ~~Automation Module~~ (REMOVED)

> **Note**: This module has been deleted from the codebase as it was an incomplete placeholder.
> Tables `automation_rules`, `automation_conditions`, `automation_actions`, `automation_logs` are no longer used.

### Table: `automation_rules`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `ruleId` | `rule_id` | Long | Primary key |
| `project` | `project_id` | FK→Project | Target project |
| `name` | `name` | String | Rule name |
| `description` | `description` | String | Description |
| `triggerType` | `trigger_type` | Enum | See trigger types below |
| `triggerConfig` | `trigger_config` | String | JSON config |
| `isActive` | `is_active` | Boolean | Active flag |
| `createdBy` | `created_by` | FK→User | Creator |
| `company` | `company_id` | FK→Company | Tenant |
| `createdAt` | `created_at` | LocalDateTime | Created |
| `updatedAt` | `updated_at` | LocalDateTime | Updated |

**Trigger Types:**
`ISSUE_CREATED`, `ISSUE_UPDATED`, `STATUS_CHANGED`, `ASSIGNEE_CHANGED`, `PRIORITY_CHANGED`, `COMMENT_ADDED`, `DUE_DATE_APPROACHING`, `SPRINT_STARTED`, `SPRINT_COMPLETED`

### Table: `automation_conditions`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `conditionId` | `condition_id` | Long | Primary key |
| `rule` | `rule_id` | FK→AutomationRule | Parent rule |
| `field` | `field` | String | Field to check (status, priority, assignee) |
| `operator` | `operator` | Enum | EQUALS, NOT_EQUALS, CONTAINS, NOT_CONTAINS, IN, NOT_IN, GREATER_THAN, LESS_THAN, IS_EMPTY, IS_NOT_EMPTY |
| `value` | `value` | String | Expected value |
| `orderIndex` | `order_index` | Integer | Condition order (default 0) |

### Table: `automation_actions`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `actionId` | `action_id` | Long | Primary key |
| `rule` | `rule_id` | FK→AutomationRule | Parent rule |
| `actionType` | `action_type` | Enum | UPDATE_FIELD, SEND_NOTIFICATION, ADD_COMMENT, ADD_LABEL, REMOVE_LABEL, ASSIGN_TO, MOVE_TO_SPRINT, SEND_WEBHOOK, SEND_EMAIL |
| `actionConfig` | `action_config` | String | JSON config |
| `orderIndex` | `order_index` | Integer | Execution order |

### Table: `automation_logs`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `logId` | `log_id` | Long | Primary key |
| `rule` | `rule_id` | FK→AutomationRule | Executed rule |
| `issue` | `issue_id` | FK→Issue | Target issue |
| `status` | `status` | Enum | SUCCESS, FAILED, SKIPPED, PARTIAL |
| `message` | `message` | String | Execution message |
| `actionsExecuted` | `actions_executed` | Integer | Count of actions run |
| `executedAt` | `executed_at` | LocalDateTime | Execution time |

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

## 12. Audit Module

### Table: `audit_logs`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `id` | `id` | Long | Primary key |
| `actor` | `actor_id` | FK→User | Actor user |
| `action` | `action` | String | Action type |
| `targetUser` | `target_user_id` | FK→User | Target user |
| `entityType` | `entity_type` | String | Entity name |
| `entityId` | `entity_id` | Long | Entity ID |
| `oldValue` | `old_value` | String | Data before change |
| `newValue` | `new_value` | String | Data after change |
| `ipAddress` | `ip_address` | String | IP address |
| `reason` | `reason` | String | Reason |
| `severity` | `severity` | Enum | INFO, WARNING, CRITICAL |
| `status` | `status` | Enum | SUCCESS, FAILED |
| `errorMessage` | `error_message` | String | Error details |
| `createdAt` | `created_at` | LocalDateTime | Timestamp |

---

## 13. Integration Module

### Table: `integrations`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `integrationId` | `integration_id` | Long | Primary key |
| `company` | `company_id` | FK→Company | Tenant |
| `integrationType` | `integration_type` | Enum | SLACK, MICROSOFT_TEAMS, GOOGLE_CALENDAR, etc |
| `name` | `name` | String | Custom name |
| `config` | `config` | String (encrypted) | JSON config (tokens, webhooks) |
| `isActive` | `is_active` | Boolean | Active status |
| `lastSyncAt` | `last_sync_at` | LocalDateTime | Last sync time |
| `lastError` | `last_error` | String | Error message |
| `connectedBy` | `connected_by` | FK→User | Who connected |
| `createdAt` | `created_at` | LocalDateTime | Created |
| `updatedAt` | `updated_at` | LocalDateTime | Updated |

---

## 14. Personal Workspace Module

### Table: `personal_tasks`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `taskId` | `task_id` | Long | Primary key |
| `workspace` | `workspace_id` | FK→PersonalWorkspace | Personal workspace |
| `title` | `title` | String | Task title |
| `description` | `description` | String | Description |
| `dueDate` | `due_date` | LocalDate | Due date |
| `status` | `status` | Enum | TODO, IN_PROGRESS, DONE |
| `priority` | `priority` | Enum | LOW, MEDIUM, HIGH |
| `labels` | `labels` | String | PRO: Comma-separated tags |
| `recurringPattern` | `recurring_pattern` | Enum | PRO: DAILY, WEEKLY, MONTHLY |
| `reminderAt` | `reminder_at` | LocalDateTime | PRO: Reminder time |
| `reminderSent` | `reminder_sent` | Boolean | Reminder sent flag |
| `createdAt` | `created_at` | LocalDateTime | Created |
| `updatedAt` | `updated_at` | LocalDateTime | Updated |
| `completedAt` | `completed_at` | LocalDateTime | Completion time |

---

## 15. Project Advanced Entities

### Table: `issue_custom_fields`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `fieldId` | `field_id` | Long | Primary key |
| `project` | `project_id` | FK→Project | Project |
| `company` | `company_id` | FK→Company | Tenant |
| `name` | `name` | String | Field name |
| `fieldType` | `field_type` | Enum | TEXT, NUMBER, DATE, SELECT, MULTI_SELECT |
| `options` | `options` | String | JSON array for SELECT types |
| `isRequired` | `is_required` | Boolean | Required flag |
| `orderIndex` | `order_index` | Integer | Display order |

### Table: `issue_custom_field_values`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `valueId` | `value_id` | Long | Primary key |
| `issue` | `issue_id` | FK→Issue | Issue |
| `field` | `field_id` | FK→IssueCustomField | Field definition |
| `value` | `value` | String | Actual value |

### Table: `issue_dependencies`
| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| `dependencyId` | `dependency_id` | Long | Primary key |
| `predecessor` | `predecessor_id` | FK→Issue | Blocking issue |
| `successor` | `successor_id` | FK→Issue | Blocked issue |
| `dependencyType` | `dependency_type` | Enum | FINISH_TO_START, START_TO_START, etc |
| `createdBy` | `created_by` | FK→User | Creator |
| `createdAt` | `created_at` | LocalDateTime | Created |

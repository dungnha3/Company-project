-- =====================================================
-- GEMINI ERP - PERFORMANCE INDEXES
-- File: 03_indexes.sql
-- Mục đích: Tạo indexes để tối ưu query performance
-- Chạy SAU KHI đã có data (01_setup.sql + 02_seed_data.sql)
-- Column names từ gemini_entities.md
-- =====================================================

-- =====================================================
-- 1. USERS TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_username' AND object_id = OBJECT_ID('users'))
    CREATE NONCLUSTERED INDEX idx_users_username ON users(username);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_email' AND object_id = OBJECT_ID('users'))
    CREATE NONCLUSTERED INDEX idx_users_email ON users(email);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_status' AND object_id = OBJECT_ID('users'))
    CREATE NONCLUSTERED INDEX idx_users_status ON users([status]) WHERE is_deleted = 0;

PRINT N'✅ Created indexes for USERS table';

-- =====================================================
-- 2. COMPANY_MEMBERS TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_company_members_user' AND object_id = OBJECT_ID('company_members'))
    CREATE NONCLUSTERED INDEX idx_company_members_user ON company_members(user_id, is_active);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_company_members_company' AND object_id = OBJECT_ID('company_members'))
    CREATE NONCLUSTERED INDEX idx_company_members_company ON company_members(company_id, is_active);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_company_members_role' AND object_id = OBJECT_ID('company_members'))
    CREATE NONCLUSTERED INDEX idx_company_members_role ON company_members(company_id, [role]);

PRINT N'✅ Created indexes for COMPANY_MEMBERS table';

-- =====================================================
-- 3. EMPLOYEES TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_employees_company' AND object_id = OBJECT_ID('employees'))
    CREATE NONCLUSTERED INDEX idx_employees_company ON employees(company_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_employees_department' AND object_id = OBJECT_ID('employees'))
    CREATE NONCLUSTERED INDEX idx_employees_department ON employees(department_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_employees_user' AND object_id = OBJECT_ID('employees'))
    CREATE NONCLUSTERED INDEX idx_employees_user ON employees(user_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_employees_status' AND object_id = OBJECT_ID('employees'))
    CREATE NONCLUSTERED INDEX idx_employees_status ON employees(company_id, [status]);

PRINT N'✅ Created indexes for EMPLOYEES table';

-- =====================================================
-- 4. PROJECTS TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_projects_company' AND object_id = OBJECT_ID('projects'))
    CREATE NONCLUSTERED INDEX idx_projects_company ON projects(company_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_projects_status' AND object_id = OBJECT_ID('projects'))
    CREATE NONCLUSTERED INDEX idx_projects_status ON projects(company_id, [status]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_projects_created_by' AND object_id = OBJECT_ID('projects'))
    CREATE NONCLUSTERED INDEX idx_projects_created_by ON projects(created_by);

PRINT N'✅ Created indexes for PROJECTS table';

-- =====================================================
-- 5. ISSUES TABLE INDEXES (HIGH VOLUME)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_issues_project' AND object_id = OBJECT_ID('issues'))
    CREATE NONCLUSTERED INDEX idx_issues_project ON issues(project_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_issues_assignee' AND object_id = OBJECT_ID('issues'))
    CREATE NONCLUSTERED INDEX idx_issues_assignee ON issues(assignee_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_issues_status' AND object_id = OBJECT_ID('issues'))
    CREATE NONCLUSTERED INDEX idx_issues_status ON issues(status_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_issues_sprint' AND object_id = OBJECT_ID('issues'))
    CREATE NONCLUSTERED INDEX idx_issues_sprint ON issues(sprint_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_issues_project_status' AND object_id = OBJECT_ID('issues'))
    CREATE NONCLUSTERED INDEX idx_issues_project_status ON issues(project_id, status_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_issues_due_date' AND object_id = OBJECT_ID('issues'))
    CREATE NONCLUSTERED INDEX idx_issues_due_date ON issues(due_date);

PRINT N'✅ Created indexes for ISSUES table';

-- =====================================================
-- 6. NOTIFICATIONS TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_notifications_user' AND object_id = OBJECT_ID('notifications'))
    CREATE NONCLUSTERED INDEX idx_notifications_user ON notifications(user_id, is_read);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_notifications_created' AND object_id = OBJECT_ID('notifications'))
    CREATE NONCLUSTERED INDEX idx_notifications_created ON notifications(user_id, created_at DESC);

PRINT N'✅ Created indexes for NOTIFICATIONS table';

-- =====================================================
-- 7. ATTENDANCES TABLE INDEXES (table: attendances)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_attendances_employee' AND object_id = OBJECT_ID('attendances'))
    CREATE NONCLUSTERED INDEX idx_attendances_employee ON attendances(employee_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_attendances_date' AND object_id = OBJECT_ID('attendances'))
    CREATE NONCLUSTERED INDEX idx_attendances_date ON attendances(employee_id, attendance_date);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_attendances_company_date' AND object_id = OBJECT_ID('attendances'))
    CREATE NONCLUSTERED INDEX idx_attendances_company_date ON attendances(company_id, attendance_date);

PRINT N'✅ Created indexes for ATTENDANCES table';

-- =====================================================
-- 8. LEAVE_REQUESTS TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_leave_employee' AND object_id = OBJECT_ID('leave_requests'))
    CREATE NONCLUSTERED INDEX idx_leave_employee ON leave_requests(employee_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_leave_status' AND object_id = OBJECT_ID('leave_requests'))
    CREATE NONCLUSTERED INDEX idx_leave_status ON leave_requests(company_id, [status]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_leave_dates' AND object_id = OBJECT_ID('leave_requests'))
    CREATE NONCLUSTERED INDEX idx_leave_dates ON leave_requests(start_date, end_date);

PRINT N'✅ Created indexes for LEAVE_REQUESTS table';

-- =====================================================
-- 9. MESSAGES TABLE INDEXES (table: messages)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_messages_room' AND object_id = OBJECT_ID('messages'))
    CREATE NONCLUSTERED INDEX idx_messages_room ON messages(room_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_messages_room_created' AND object_id = OBJECT_ID('messages'))
    CREATE NONCLUSTERED INDEX idx_messages_room_created ON messages(room_id, created_at DESC);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_messages_sender' AND object_id = OBJECT_ID('messages'))
    CREATE NONCLUSTERED INDEX idx_messages_sender ON messages(sender_id);

PRINT N'✅ Created indexes for MESSAGES table';

-- =====================================================
-- 10. SALARIES TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_salaries_employee' AND object_id = OBJECT_ID('salaries'))
    CREATE NONCLUSTERED INDEX idx_salaries_employee ON salaries(employee_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_salaries_period' AND object_id = OBJECT_ID('salaries'))
    CREATE NONCLUSTERED INDEX idx_salaries_period ON salaries(company_id, [month], [year]);

PRINT N'✅ Created indexes for SALARIES table';

-- =====================================================
-- 11. ISSUE_ACTIVITIES TABLE INDEXES (table: issue_activities)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_issue_activities_issue' AND object_id = OBJECT_ID('issue_activities'))
    CREATE NONCLUSTERED INDEX idx_issue_activities_issue ON issue_activities(issue_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_issue_activities_user' AND object_id = OBJECT_ID('issue_activities'))
    CREATE NONCLUSTERED INDEX idx_issue_activities_user ON issue_activities(user_id, created_at DESC);

PRINT N'✅ Created indexes for ISSUE_ACTIVITIES table';

-- =====================================================
-- 12. REFRESH_TOKENS - SKIP (indexes defined in Entity @Table annotation)
-- =====================================================
PRINT N'⏭ REFRESH_TOKENS indexes already defined in Entity';


-- =====================================================
-- 13. SPRINTS TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_sprints_project' AND object_id = OBJECT_ID('sprints'))
    CREATE NONCLUSTERED INDEX idx_sprints_project ON sprints(project_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_sprints_status' AND object_id = OBJECT_ID('sprints'))
    CREATE NONCLUSTERED INDEX idx_sprints_status ON sprints(project_id, [status]);

PRINT N'✅ Created indexes for SPRINTS table';

-- =====================================================
-- 14. CHAT_ROOMS TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_chat_rooms_company' AND object_id = OBJECT_ID('chat_rooms'))
    CREATE NONCLUSTERED INDEX idx_chat_rooms_company ON chat_rooms(company_id);

PRINT N'✅ Created indexes for CHAT_ROOMS table';

-- =====================================================
-- 15. PROJECT_MEMBERS TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_project_members_project' AND object_id = OBJECT_ID('project_members'))
    CREATE NONCLUSTERED INDEX idx_project_members_project ON project_members(project_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_project_members_user' AND object_id = OBJECT_ID('project_members'))
    CREATE NONCLUSTERED INDEX idx_project_members_user ON project_members(user_id);

PRINT N'✅ Created indexes for PROJECT_MEMBERS table';

-- =====================================================
-- SUMMARY
-- =====================================================
PRINT N'';
PRINT N'=====================================================';
PRINT N'✅ ALL PERFORMANCE INDEXES CREATED SUCCESSFULLY';
PRINT N'Total: 30+ indexes across 15 tables';
PRINT N'=====================================================';

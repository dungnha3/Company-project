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
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_users_username' AND object_id = OBJECT_ID(N'[dbo].[users]'))
    CREATE NONCLUSTERED INDEX idx_users_username ON [dbo].[users](username);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_users_email' AND object_id = OBJECT_ID(N'[dbo].[users]'))
    CREATE NONCLUSTERED INDEX idx_users_email ON [dbo].[users](email);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_users_status' AND object_id = OBJECT_ID(N'[dbo].[users]'))
    CREATE NONCLUSTERED INDEX idx_users_status ON [dbo].[users]([status]) WHERE is_deleted = 0;
GO

PRINT N'✅ Created indexes for USERS table';
GO

-- =====================================================
-- 2. COMPANY_MEMBERS TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_company_members_user' AND object_id = OBJECT_ID(N'[dbo].[company_members]'))
    CREATE NONCLUSTERED INDEX idx_company_members_user ON [dbo].[company_members](user_id, is_active);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_company_members_company' AND object_id = OBJECT_ID(N'[dbo].[company_members]'))
    CREATE NONCLUSTERED INDEX idx_company_members_company ON [dbo].[company_members](company_id, is_active);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_company_member_roles' AND object_id = OBJECT_ID(N'[dbo].[company_member_roles]'))
    CREATE NONCLUSTERED INDEX idx_company_member_roles ON [dbo].[company_member_roles](member_id, [role]);
GO

PRINT N'✅ Created indexes for COMPANY_MEMBER_ROLES table';
GO

-- =====================================================
-- 3. EMPLOYEES TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_employees_company' AND object_id = OBJECT_ID(N'[dbo].[employees]'))
    CREATE NONCLUSTERED INDEX idx_employees_company ON [dbo].[employees](company_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_employees_department' AND object_id = OBJECT_ID(N'[dbo].[employees]'))
    CREATE NONCLUSTERED INDEX idx_employees_department ON [dbo].[employees](department_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_employees_user' AND object_id = OBJECT_ID(N'[dbo].[employees]'))
    CREATE NONCLUSTERED INDEX idx_employees_user ON [dbo].[employees](user_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_employees_status' AND object_id = OBJECT_ID(N'[dbo].[employees]'))
    CREATE NONCLUSTERED INDEX idx_employees_status ON [dbo].[employees](company_id, [status]);
GO

PRINT N'✅ Created indexes for EMPLOYEES table';
GO

-- =====================================================
-- 4. PROJECTS TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_projects_company' AND object_id = OBJECT_ID(N'[dbo].[projects]'))
    CREATE NONCLUSTERED INDEX idx_projects_company ON [dbo].[projects](company_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_projects_status' AND object_id = OBJECT_ID(N'[dbo].[projects]'))
    CREATE NONCLUSTERED INDEX idx_projects_status ON [dbo].[projects](company_id, [status]);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_projects_created_by' AND object_id = OBJECT_ID(N'[dbo].[projects]'))
    CREATE NONCLUSTERED INDEX idx_projects_created_by ON [dbo].[projects](created_by);
GO

PRINT N'✅ Created indexes for PROJECTS table';
GO

-- =====================================================
-- 5. ISSUES TABLE INDEXES (HIGH VOLUME)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_issues_project' AND object_id = OBJECT_ID(N'[dbo].[issues]'))
    CREATE NONCLUSTERED INDEX idx_issues_project ON [dbo].[issues](project_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_issues_assignee' AND object_id = OBJECT_ID(N'[dbo].[issues]'))
    CREATE NONCLUSTERED INDEX idx_issues_assignee ON [dbo].[issues](assignee_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_issues_status' AND object_id = OBJECT_ID(N'[dbo].[issues]'))
    CREATE NONCLUSTERED INDEX idx_issues_status ON [dbo].[issues](status_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_issues_sprint' AND object_id = OBJECT_ID(N'[dbo].[issues]'))
    CREATE NONCLUSTERED INDEX idx_issues_sprint ON [dbo].[issues](sprint_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_issues_project_status' AND object_id = OBJECT_ID(N'[dbo].[issues]'))
    CREATE NONCLUSTERED INDEX idx_issues_project_status ON [dbo].[issues](project_id, status_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_issues_due_date' AND object_id = OBJECT_ID(N'[dbo].[issues]'))
    CREATE NONCLUSTERED INDEX idx_issues_due_date ON [dbo].[issues](due_date);
GO

PRINT N'✅ Created indexes for ISSUES table';
GO

-- =====================================================
-- 6. NOTIFICATIONS TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_notifications_user' AND object_id = OBJECT_ID(N'[dbo].[notifications]'))
    CREATE NONCLUSTERED INDEX idx_notifications_user ON [dbo].[notifications](user_id, is_read);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_notifications_created' AND object_id = OBJECT_ID(N'[dbo].[notifications]'))
    CREATE NONCLUSTERED INDEX idx_notifications_created ON [dbo].[notifications](user_id, created_at DESC);
GO

PRINT N'✅ Created indexes for NOTIFICATIONS table';
GO

-- =====================================================
-- 7. ATTENDANCES TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_attendances_employee' AND object_id = OBJECT_ID(N'[dbo].[attendances]'))
    CREATE NONCLUSTERED INDEX idx_attendances_employee ON [dbo].[attendances](employee_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_attendances_date' AND object_id = OBJECT_ID(N'[dbo].[attendances]'))
    CREATE NONCLUSTERED INDEX idx_attendances_date ON [dbo].[attendances](employee_id, attendance_date);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_attendances_company_date' AND object_id = OBJECT_ID(N'[dbo].[attendances]'))
    CREATE NONCLUSTERED INDEX idx_attendances_company_date ON [dbo].[attendances](company_id, attendance_date);
GO

PRINT N'✅ Created indexes for ATTENDANCES table';
GO

-- =====================================================
-- 8. LEAVE_REQUESTS TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_leave_employee' AND object_id = OBJECT_ID(N'[dbo].[leave_requests]'))
    CREATE NONCLUSTERED INDEX idx_leave_employee ON [dbo].[leave_requests](employee_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_leave_status' AND object_id = OBJECT_ID(N'[dbo].[leave_requests]'))
    CREATE NONCLUSTERED INDEX idx_leave_status ON [dbo].[leave_requests](company_id, [status]);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_leave_dates' AND object_id = OBJECT_ID(N'[dbo].[leave_requests]'))
    CREATE NONCLUSTERED INDEX idx_leave_dates ON [dbo].[leave_requests](start_date, end_date);
GO

PRINT N'✅ Created indexes for LEAVE_REQUESTS table';
GO

-- =====================================================
-- 9. MESSAGES TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_messages_room' AND object_id = OBJECT_ID(N'[dbo].[messages]'))
    CREATE NONCLUSTERED INDEX idx_messages_room ON [dbo].[messages](room_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_messages_room_created' AND object_id = OBJECT_ID(N'[dbo].[messages]'))
    CREATE NONCLUSTERED INDEX idx_messages_room_created ON [dbo].[messages](room_id, created_at DESC);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_messages_sender' AND object_id = OBJECT_ID(N'[dbo].[messages]'))
    CREATE NONCLUSTERED INDEX idx_messages_sender ON [dbo].[messages](sender_id);
GO

PRINT N'✅ Created indexes for MESSAGES table';
GO

-- =====================================================
-- 10. SALARIES TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_salaries_employee' AND object_id = OBJECT_ID(N'[dbo].[salaries]'))
    CREATE NONCLUSTERED INDEX idx_salaries_employee ON [dbo].[salaries](employee_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_salaries_period' AND object_id = OBJECT_ID(N'[dbo].[salaries]'))
    CREATE NONCLUSTERED INDEX idx_salaries_period ON [dbo].[salaries](company_id, [month], [year]);
GO

PRINT N'✅ Created indexes for SALARIES table';
GO

-- =====================================================
-- 11. ISSUE_ACTIVITIES TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_issue_activities_issue' AND object_id = OBJECT_ID(N'[dbo].[issue_activities]'))
    CREATE NONCLUSTERED INDEX idx_issue_activities_issue ON [dbo].[issue_activities](issue_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_issue_activities_user' AND object_id = OBJECT_ID(N'[dbo].[issue_activities]'))
    CREATE NONCLUSTERED INDEX idx_issue_activities_user ON [dbo].[issue_activities](user_id, created_at DESC);
GO

PRINT N'✅ Created indexes for ISSUE_ACTIVITIES table';
GO

-- =====================================================
-- 12. SPRINTS TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_sprints_project' AND object_id = OBJECT_ID(N'[dbo].[sprints]'))
    CREATE NONCLUSTERED INDEX idx_sprints_project ON [dbo].[sprints](project_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_sprints_status' AND object_id = OBJECT_ID(N'[dbo].[sprints]'))
    CREATE NONCLUSTERED INDEX idx_sprints_status ON [dbo].[sprints](project_id, [status]);
GO

PRINT N'✅ Created indexes for SPRINTS table';
GO

-- =====================================================
-- 13. CHAT_ROOMS TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_chat_rooms_company' AND object_id = OBJECT_ID(N'[dbo].[chat_rooms]'))
    CREATE NONCLUSTERED INDEX idx_chat_rooms_company ON [dbo].[chat_rooms](company_id);
GO

PRINT N'✅ Created indexes for CHAT_ROOMS table';
GO

-- =====================================================
-- 14. PROJECT_MEMBERS TABLE INDEXES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_project_members_project' AND object_id = OBJECT_ID(N'[dbo].[project_members]'))
    CREATE NONCLUSTERED INDEX idx_project_members_project ON [dbo].[project_members](project_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_project_members_user' AND object_id = OBJECT_ID(N'[dbo].[project_members]'))
    CREATE NONCLUSTERED INDEX idx_project_members_user ON [dbo].[project_members](user_id);
GO

PRINT N'✅ Created indexes for PROJECT_MEMBERS table';
GO

-- =====================================================
-- SUMMARY
-- =====================================================
PRINT N'';
PRINT N'=====================================================';
PRINT N'✅ ALL PERFORMANCE INDEXES CREATED SUCCESSFULLY';
PRINT N'Total: 40+ indexes across 20 tables';
PRINT N'=====================================================';
GO

-- =====================================================
-- 15. INTEGRATIONS TABLE INDEXES (NEW)
-- =====================================================
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'integrations')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_integrations_company' AND object_id = OBJECT_ID(N'[dbo].[integrations]'))
        CREATE NONCLUSTERED INDEX idx_integrations_company ON [dbo].[integrations](company_id);
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_integrations_type' AND object_id = OBJECT_ID(N'[dbo].[integrations]'))
        CREATE NONCLUSTERED INDEX idx_integrations_type ON [dbo].[integrations](integration_type);
    PRINT N'✅ Created indexes for INTEGRATIONS table';
END
GO

-- =====================================================
-- 16. PERSONAL_TASKS TABLE INDEXES (NEW)
-- =====================================================
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'personal_tasks')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_pt_workspace' AND object_id = OBJECT_ID(N'[dbo].[personal_tasks]'))
        CREATE NONCLUSTERED INDEX idx_pt_workspace ON [dbo].[personal_tasks](workspace_id);
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_pt_status' AND object_id = OBJECT_ID(N'[dbo].[personal_tasks]'))
        CREATE NONCLUSTERED INDEX idx_pt_status ON [dbo].[personal_tasks](workspace_id, [status]);
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_pt_due' AND object_id = OBJECT_ID(N'[dbo].[personal_tasks]'))
        CREATE NONCLUSTERED INDEX idx_pt_due ON [dbo].[personal_tasks](workspace_id, due_date);
    PRINT N'✅ Created indexes for PERSONAL_TASKS table';
END
GO

-- =====================================================
-- 17. ISSUE_CUSTOM_FIELDS TABLE INDEXES (NEW)
-- =====================================================
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'issue_custom_fields')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_custom_fields_project' AND object_id = OBJECT_ID(N'[dbo].[issue_custom_fields]'))
        CREATE NONCLUSTERED INDEX idx_custom_fields_project ON [dbo].[issue_custom_fields](project_id);
    PRINT N'✅ Created indexes for ISSUE_CUSTOM_FIELDS table';
END
GO

-- =====================================================
-- 18. ISSUE_CUSTOM_FIELD_VALUES TABLE INDEXES (NEW)
-- =====================================================
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'issue_custom_field_values')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_cfv_issue' AND object_id = OBJECT_ID(N'[dbo].[issue_custom_field_values]'))
        CREATE NONCLUSTERED INDEX idx_cfv_issue ON [dbo].[issue_custom_field_values](issue_id);
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_cfv_field' AND object_id = OBJECT_ID(N'[dbo].[issue_custom_field_values]'))
        CREATE NONCLUSTERED INDEX idx_cfv_field ON [dbo].[issue_custom_field_values](field_id);
    PRINT N'✅ Created indexes for ISSUE_CUSTOM_FIELD_VALUES table';
END
GO

-- =====================================================
-- 19. ISSUE_DEPENDENCIES TABLE INDEXES (NEW)
-- =====================================================
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'issue_dependencies')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_deps_predecessor' AND object_id = OBJECT_ID(N'[dbo].[issue_dependencies]'))
        CREATE NONCLUSTERED INDEX idx_deps_predecessor ON [dbo].[issue_dependencies](predecessor_id);
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_deps_successor' AND object_id = OBJECT_ID(N'[dbo].[issue_dependencies]'))
        CREATE NONCLUSTERED INDEX idx_deps_successor ON [dbo].[issue_dependencies](successor_id);
    PRINT N'✅ Created indexes for ISSUE_DEPENDENCIES table';
END
GO

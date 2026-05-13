-- =====================================================
-- GEMINI ERP - SEED DATA
-- File: 02_seed_data.sql
-- Dữ liệu test cho Company A (Tech Corp - ENTERPRISE)
-- Chạy SAU 01_setup.sql
-- =====================================================

USE DACN;
GO

-- =====================================================
-- VARIABLES
-- =====================================================
DECLARE @owner_a BIGINT, @admin_a BIGINT, @hr_a BIGINT, @acc_a BIGINT, @pm_a BIGINT;
DECLARE @dev1 BIGINT, @dev2 BIGINT, @dev3 BIGINT, @emp1 BIGINT, @emp2 BIGINT;
DECLARE @owner_b BIGINT, @pm_b BIGINT, @dev_b1 BIGINT;

SELECT @owner_a = user_id FROM users WHERE username = 'owner_a';
SELECT @admin_a = user_id FROM users WHERE username = 'admin_a';
SELECT @hr_a = user_id FROM users WHERE username = 'hr_a';
SELECT @acc_a = user_id FROM users WHERE username = 'acc_a';
SELECT @pm_a = user_id FROM users WHERE username = 'pm_a';
SELECT @dev1 = user_id FROM users WHERE username = 'dev_a1';
SELECT @dev2 = user_id FROM users WHERE username = 'dev_a2';
SELECT @dev3 = user_id FROM users WHERE username = 'dev_a3';
SELECT @emp1 = user_id FROM users WHERE username = 'emp_a1';
SELECT @emp2 = user_id FROM users WHERE username = 'emp_a2';
SELECT @owner_b = user_id FROM users WHERE username = 'owner_b';
SELECT @pm_b = user_id FROM users WHERE username = 'pm_b';
SELECT @dev_b1 = user_id FROM users WHERE username = 'dev_b1';

DECLARE @s_todo INT, @s_prog INT, @s_review INT, @s_done INT;
SELECT @s_todo = status_id FROM issue_statuses WHERE name = 'To Do';
SELECT @s_prog = status_id FROM issue_statuses WHERE name = 'In Progress';
SELECT @s_review = status_id FROM issue_statuses WHERE name = 'Review';
SELECT @s_done = status_id FROM issue_statuses WHERE name = 'Done';

-- =====================================================
-- 3. EMPLOYEES (Company A)
-- =====================================================
INSERT INTO employees (user_id, company_id, full_name, id_card, date_of_birth, gender, hire_date, [status], base_salary, allowance, created_at, updated_at)
SELECT u.user_id, 1,
    N'NV ' + u.username,
    '0' + CAST(u.user_id + 123456780 AS VARCHAR),
    DATEADD(year, -25 - (u.user_id % 10), GETDATE()),
    CASE WHEN u.user_id % 2 = 0 THEN 'MALE' ELSE 'FEMALE' END,
    DATEADD(month, -6 - (u.user_id % 24), GETDATE()),
    'ACTIVE',
    15000000 + (u.user_id * 500000),
    2000000,
    GETDATE(), GETDATE()
FROM users u
WHERE u.is_system_admin = 0
  AND u.username LIKE '%_a%'
  AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.user_id = u.user_id);
PRINT N'✅ Employees created';
GO


-- =====================================================
-- 5. LEAVE REQUESTS
-- =====================================================
DECLARE @lr_emp1 BIGINT, @lr_emp2 BIGINT, @lr_emp3 BIGINT;
SELECT @lr_emp1 = employee_id FROM (SELECT employee_id, ROW_NUMBER() OVER (ORDER BY employee_id) AS rn FROM employees WHERE company_id = 1) t WHERE rn = 1;
SELECT @lr_emp2 = employee_id FROM (SELECT employee_id, ROW_NUMBER() OVER (ORDER BY employee_id) AS rn FROM employees WHERE company_id = 1) t WHERE rn = 2;
SELECT @lr_emp3 = employee_id FROM (SELECT employee_id, ROW_NUMBER() OVER (ORDER BY employee_id) AS rn FROM employees WHERE company_id = 1) t WHERE rn = 3;

IF NOT EXISTS (SELECT 1 FROM leave_requests WHERE company_id = 1)
BEGIN
    INSERT INTO leave_requests (employee_id, company_id, leave_type, start_date, end_date, total_days, reason, [status], created_at, updated_at) VALUES
        (@lr_emp1, 1, 'ANNUAL',  DATEADD(day, 5, GETDATE()), DATEADD(day, 7, GETDATE()), 3, N'Nghỉ phép thường niên', 'APPROVED', GETDATE(), GETDATE()),
        (@lr_emp1, 1, 'SICK',    DATEADD(day, -10, GETDATE()), DATEADD(day, -9, GETDATE()), 2, N'Bị ốm',                'APPROVED', GETDATE(), GETDATE()),
        (@lr_emp2, 1, 'ANNUAL',  DATEADD(day, 10, GETDATE()), DATEADD(day, 14, GETDATE()), 5, N'Du lịch gia đình',      'PENDING',  GETDATE(), GETDATE()),
        (@lr_emp2, 1, 'UNPAID',  DATEADD(day, -5, GETDATE()), DATEADD(day, -4, GETDATE()), 2, N'Việc cá nhân',          'REJECTED', GETDATE(), GETDATE()),
        (@lr_emp3, 1, 'ANNUAL',  DATEADD(day, 20, GETDATE()), DATEADD(day, 22, GETDATE()), 3, N'Về quê',                'PENDING',  GETDATE(), GETDATE()),
        (@lr_emp3, 1, 'SICK',    DATEADD(day, -3, GETDATE()), DATEADD(day, -2, GETDATE()), 2, N'Khám bác sĩ',           'APPROVED', GETDATE(), GETDATE());
    PRINT N'✅ Leave requests created';
END
GO


-- =====================================================
-- 7. PROJECTS (Company A: 3 projects, Company B: 1 project)
-- =====================================================
DECLARE @owner_a2 BIGINT, @pm_a2 BIGINT, @pm_b2 BIGINT;
SELECT @owner_a2 = user_id FROM users WHERE username = 'owner_a';
SELECT @pm_a2 = user_id FROM users WHERE username = 'pm_a';
SELECT @pm_b2 = user_id FROM users WHERE username = 'pm_b';

IF NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 1)
BEGIN
    INSERT INTO projects (key_project, name, description, [status], is_active, company_id, created_by, start_date, end_date, created_at, updated_at) VALUES
        ('HRMS', N'HR Management System',       N'HRM module cho quản lý nhân sự',      'ACTIVE',    1, 1, @owner_a2, DATEADD(month, -3, GETDATE()), DATEADD(month, 2, GETDATE()), GETDATE(), GETDATE()),
        ('ECOM', N'E-Commerce Platform',         N'Nền tảng thương mại điện tử',         'ACTIVE',    1, 1, @pm_a2,    DATEADD(month, -1, GETDATE()), DATEADD(month, 4, GETDATE()), GETDATE(), GETDATE()),
        ('MOBI', N'Mobile App',                  N'Ứng dụng mobile cho nhân viên',       'ON_HOLD',   1, 1, @pm_a2,    DATEADD(month, 1, GETDATE()),  DATEADD(month, 5, GETDATE()), GETDATE(), GETDATE());
    PRINT N'✅ Projects for Company A created';
END

IF NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 2)
BEGIN
    INSERT INTO projects (key_project, name, description, [status], is_active, company_id, created_by, start_date, end_date, created_at, updated_at) VALUES
        ('CRM', N'Customer Relationship',       N'Hệ thống CRM',                        'ACTIVE',    1, 2, @pm_b2,    DATEADD(month, -2, GETDATE()), DATEADD(month, 3, GETDATE()), GETDATE(), GETDATE());
    PRINT N'✅ Projects for Company B created';
END
GO

-- =====================================================
-- 8. PROJECT MEMBERS
-- =====================================================
DECLARE @proj_hrms BIGINT, @proj_ecom BIGINT, @proj_crm BIGINT;
SELECT @proj_hrms = project_id FROM projects WHERE key_project = 'HRMS';
SELECT @proj_ecom = project_id FROM projects WHERE key_project = 'ECOM';
SELECT @proj_crm = project_id FROM projects WHERE key_project = 'CRM';

DECLARE @ow_a BIGINT, @pm_aa BIGINT, @dv1 BIGINT, @dv2 BIGINT, @dv3 BIGINT, @e1 BIGINT;
SELECT @ow_a = user_id FROM users WHERE username = 'owner_a';
SELECT @pm_aa = user_id FROM users WHERE username = 'pm_a';
SELECT @dv1 = user_id FROM users WHERE username = 'dev_a1';
SELECT @dv2 = user_id FROM users WHERE username = 'dev_a2';
SELECT @dv3 = user_id FROM users WHERE username = 'dev_a3';
SELECT @e1 = user_id FROM users WHERE username = 'emp_a1';

IF NOT EXISTS (SELECT 1 FROM project_members WHERE project_id = @proj_hrms)
BEGIN
    -- HRMS: owner=OWNER, pm=MANAGER, devs=MEMBER
    INSERT INTO project_members (project_id, user_id, [role], created_at, updated_at) VALUES
        (@proj_hrms, @ow_a,  'OWNER',   GETDATE(), GETDATE()),
        (@proj_hrms, @pm_aa, 'MANAGER', GETDATE(), GETDATE()),
        (@proj_hrms, @dv1,   'MEMBER',  GETDATE(), GETDATE()),
        (@proj_hrms, @dv2,   'MEMBER',  GETDATE(), GETDATE()),
        (@proj_hrms, @dv3,   'MEMBER',  GETDATE(), GETDATE()),
        (@proj_hrms, @e1,    'MEMBER',  GETDATE(), GETDATE());

    -- ECOM: pm=OWNER, devs=MEMBER
    INSERT INTO project_members (project_id, user_id, [role], created_at, updated_at) VALUES
        (@proj_ecom, @pm_aa, 'OWNER',   GETDATE(), GETDATE()),
        (@proj_ecom, @dv1,   'MEMBER',  GETDATE(), GETDATE()),
        (@proj_ecom, @dv2,   'MEMBER',  GETDATE(), GETDATE());
    PRINT N'✅ Project members created';
END

-- CRM project members (Company B)
DECLARE @ow_b BIGINT, @pm_bb BIGINT, @db1 BIGINT;
SELECT @ow_b = user_id FROM users WHERE username = 'owner_b';
SELECT @pm_bb = user_id FROM users WHERE username = 'pm_b';
SELECT @db1 = user_id FROM users WHERE username = 'dev_b1';

IF NOT EXISTS (SELECT 1 FROM project_members WHERE project_id = @proj_crm)
BEGIN
    INSERT INTO project_members (project_id, user_id, [role], created_at, updated_at) VALUES
        (@proj_crm, @ow_b,  'OWNER',   GETDATE(), GETDATE()),
        (@proj_crm, @pm_bb, 'MANAGER', GETDATE(), GETDATE()),
        (@proj_crm, @db1,   'MEMBER',  GETDATE(), GETDATE());
END
GO

-- =====================================================
-- 9. SPRINTS (HRMS: 4 sprints cho burndown/velocity)
-- =====================================================
DECLARE @proj_id BIGINT;
SELECT @proj_id = project_id FROM projects WHERE key_project = 'HRMS';
DECLARE @creator BIGINT;
SELECT @creator = user_id FROM users WHERE username = 'owner_a';

IF NOT EXISTS (SELECT 1 FROM sprints WHERE project_id = @proj_id)
BEGIN
    INSERT INTO sprints (project_id, name, goal, start_date, end_date, [status], created_by, created_at, updated_at) VALUES
        (@proj_id, N'Sprint 1 - Foundation',    N'Authentication + DB setup',       DATEADD(day, -56, GETDATE()), DATEADD(day, -42, GETDATE()), 'COMPLETED', @creator, GETDATE(), GETDATE()),
        (@proj_id, N'Sprint 2 - Core CRUD',     N'Employee + Department CRUD',      DATEADD(day, -42, GETDATE()), DATEADD(day, -28, GETDATE()), 'COMPLETED', @creator, GETDATE(), GETDATE()),
        (@proj_id, N'Sprint 3 - HR Features',   N'Attendance + Leave + Salary',     DATEADD(day, -28, GETDATE()), DATEADD(day, -14, GETDATE()), 'COMPLETED', @creator, GETDATE(), GETDATE()),
        (@proj_id, N'Sprint 4 - Integration',   N'APIs + Testing + Analytics',      DATEADD(day, -14, GETDATE()), GETDATE(),                    'ACTIVE',    @creator, GETDATE(), GETDATE()),
        (@proj_id, N'Sprint 5 - Polish',         N'Bug fixes + UI improvements',    DATEADD(day, 1, GETDATE()),   DATEADD(day, 14, GETDATE()),  'PLANNING',  @creator, GETDATE(), GETDATE());
    PRINT N'✅ 5 sprints created (3 completed, 1 active, 1 planning)';
END
GO

-- =====================================================
-- 10. ISSUES (30 issues across sprints - rich data for charts)
-- =====================================================
DECLARE @p BIGINT, @s1 BIGINT, @s2 BIGINT, @s3 BIGINT, @s4 BIGINT;
SELECT @p = project_id FROM projects WHERE key_project = 'HRMS';
SELECT @s1 = sprint_id FROM sprints WHERE name LIKE 'Sprint 1%' AND project_id = @p;
SELECT @s2 = sprint_id FROM sprints WHERE name LIKE 'Sprint 2%' AND project_id = @p;
SELECT @s3 = sprint_id FROM sprints WHERE name LIKE 'Sprint 3%' AND project_id = @p;
SELECT @s4 = sprint_id FROM sprints WHERE name LIKE 'Sprint 4%' AND project_id = @p;

DECLARE @st INT, @sp INT, @sr INT, @sd INT;
SELECT @st = status_id FROM issue_statuses WHERE name = 'To Do';
SELECT @sp = status_id FROM issue_statuses WHERE name = 'In Progress';
SELECT @sr = status_id FROM issue_statuses WHERE name = 'Review';
SELECT @sd = status_id FROM issue_statuses WHERE name = 'Done';

DECLARE @u_own BIGINT, @u_pm BIGINT, @u_d1 BIGINT, @u_d2 BIGINT, @u_d3 BIGINT, @u_e1 BIGINT;
SELECT @u_own = user_id FROM users WHERE username = 'owner_a';
SELECT @u_pm = user_id FROM users WHERE username = 'pm_a';
SELECT @u_d1 = user_id FROM users WHERE username = 'dev_a1';
SELECT @u_d2 = user_id FROM users WHERE username = 'dev_a2';
SELECT @u_d3 = user_id FROM users WHERE username = 'dev_a3';
SELECT @u_e1 = user_id FROM users WHERE username = 'emp_a1';

IF NOT EXISTS (SELECT 1 FROM issues WHERE project_id = @p)
BEGIN
    INSERT INTO issues (project_id, sprint_id, issue_key, title, description, status_id, priority, reporter_id, assignee_id, due_date, estimated_hours, actual_hours, created_at, updated_at) VALUES
        -- Sprint 1 (COMPLETED) - 6 issues, all Done → velocity=48h
        (@p, @s1, 'HRMS-1',  N'Setup project structure',         N'Maven + packages',         @sd, 'HIGH',     @u_own, @u_d1, DATEADD(day,-50,GETDATE()), 8,  6,  DATEADD(day,-56,GETDATE()), GETDATE()),
        (@p, @s1, 'HRMS-2',  N'Database schema design',          N'ERD + migration',           @sd, 'HIGH',     @u_own, @u_d2, DATEADD(day,-48,GETDATE()), 16, 20, DATEADD(day,-56,GETDATE()), GETDATE()),
        (@p, @s1, 'HRMS-3',  N'JWT Authentication',              N'Login/Register/Token',      @sd, 'CRITICAL', @u_pm,  @u_d1, DATEADD(day,-45,GETDATE()), 24, 28, DATEADD(day,-55,GETDATE()), GETDATE()),
        (@p, @s1, 'HRMS-4',  N'User CRUD API',                   N'User management',           @sd, 'HIGH',     @u_pm,  @u_d3, DATEADD(day,-44,GETDATE()), 16, 14, DATEADD(day,-54,GETDATE()), GETDATE()),
        (@p, @s1, 'HRMS-5',  N'Security config',                 N'CORS + filters',            @sd, 'HIGH',     @u_own, @u_d1, DATEADD(day,-43,GETDATE()), 8,  10, DATEADD(day,-53,GETDATE()), GETDATE()),
        (@p, @s1, 'HRMS-6',  N'Error handling',                  N'GlobalExceptionHandler',    @sd, 'MEDIUM',   @u_pm,  @u_d2, DATEADD(day,-42,GETDATE()), 6,  5,  DATEADD(day,-52,GETDATE()), GETDATE()),

        -- Sprint 2 (COMPLETED) - 6 issues, all Done → velocity=56h
        (@p, @s2, 'HRMS-7',  N'Employee CRUD',                   N'Full CRUD API',             @sd, 'HIGH',     @u_own, @u_d1, DATEADD(day,-35,GETDATE()), 16, 14, DATEADD(day,-42,GETDATE()), GETDATE()),
        (@p, @s2, 'HRMS-8',  N'Department management',           N'CRUD + assign manager',     @sd, 'MEDIUM',   @u_pm,  @u_d2, DATEADD(day,-33,GETDATE()), 12, 10, DATEADD(day,-41,GETDATE()), GETDATE()),
        (@p, @s2, 'HRMS-9',  N'Position management',             N'CRUD + salary coefficient', @sd, 'MEDIUM',   @u_pm,  @u_d3, DATEADD(day,-32,GETDATE()), 8,  8,  DATEADD(day,-40,GETDATE()), GETDATE()),
        (@p, @s2, 'HRMS-10', N'Company settings API',            N'Feature toggles',           @sd, 'HIGH',     @u_own, @u_d1, DATEADD(day,-30,GETDATE()), 10, 12, DATEADD(day,-39,GETDATE()), GETDATE()),
        (@p, @s2, 'HRMS-11', N'Multi-tenant filter',             N'Tenant isolation',          @sd, 'CRITICAL', @u_own, @u_d2, DATEADD(day,-29,GETDATE()), 20, 24, DATEADD(day,-38,GETDATE()), GETDATE()),
        (@p, @s2, 'HRMS-12', N'Role-based permissions',          N'Access control',            @sd, 'HIGH',     @u_pm,  @u_d3, DATEADD(day,-28,GETDATE()), 12, 10, DATEADD(day,-37,GETDATE()), GETDATE()),

        -- Sprint 3 (COMPLETED) - 7 issues, all Done → velocity=68h
        (@p, @s3, 'HRMS-13', N'Attendance check-in/out',         N'GPS + manual',              @sd, 'HIGH',     @u_pm,  @u_d1, DATEADD(day,-21,GETDATE()), 20, 22, DATEADD(day,-28,GETDATE()), GETDATE()),
        (@p, @s3, 'HRMS-14', N'Leave request workflow',          N'Apply + approve + reject',  @sd, 'HIGH',     @u_own, @u_d2, DATEADD(day,-20,GETDATE()), 16, 14, DATEADD(day,-27,GETDATE()), GETDATE()),
        (@p, @s3, 'HRMS-15', N'Salary calculation',              N'Auto calc gross/net',       @sd, 'CRITICAL', @u_own, @u_d3, DATEADD(day,-18,GETDATE()), 24, 28, DATEADD(day,-26,GETDATE()), GETDATE()),
        (@p, @s3, 'HRMS-16', N'Contract management',             N'CRUD + expiry alerts',      @sd, 'MEDIUM',   @u_pm,  @u_d1, DATEADD(day,-17,GETDATE()), 12, 10, DATEADD(day,-25,GETDATE()), GETDATE()),
        (@p, @s3, 'HRMS-17', N'Review/evaluation',               N'Quarterly review',          @sd, 'MEDIUM',   @u_pm,  @u_d2, DATEADD(day,-16,GETDATE()), 10, 8,  DATEADD(day,-24,GETDATE()), GETDATE()),
        (@p, @s3, 'HRMS-18', N'HR Dashboard',                    N'Statistics + charts',       @sd, 'HIGH',     @u_own, @u_e1, DATEADD(day,-15,GETDATE()), 16, 18, DATEADD(day,-23,GETDATE()), GETDATE()),
        (@p, @s3, 'HRMS-19', N'Email notifications',             N'Leave + contract alerts',   @sd, 'LOW',      @u_pm,  @u_d3, DATEADD(day,-14,GETDATE()), 8,  6,  DATEADD(day,-22,GETDATE()), GETDATE()),

        -- Sprint 4 (ACTIVE) - 8 issues mixed status → burndown data
        (@p, @s4, 'HRMS-20', N'Time tracking module',            N'Log hours per issue',       @sd, 'HIGH',     @u_own, @u_d1, DATEADD(day,-7,GETDATE()),  16, 14, DATEADD(day,-14,GETDATE()), GETDATE()),
        (@p, @s4, 'HRMS-21', N'Calendar events',                 N'Meeting + deadline events', @sd, 'MEDIUM',   @u_pm,  @u_d2, DATEADD(day,-5,GETDATE()),  12, 10, DATEADD(day,-13,GETDATE()), GETDATE()),
        (@p, @s4, 'HRMS-22', N'Project analytics',               N'Burndown + velocity',       @sr, 'HIGH',     @u_own, @u_d3, DATEADD(day,-2,GETDATE()),  20, 16, DATEADD(day,-12,GETDATE()), GETDATE()),
        (@p, @s4, 'HRMS-23', N'Chat real-time',                  N'WebSocket messaging',       @sp, 'HIGH',     @u_pm,  @u_d1, DATEADD(day,2,GETDATE()),   24, 8,  DATEADD(day,-11,GETDATE()), GETDATE()),
        (@p, @s4, 'HRMS-24', N'File storage module',             N'Upload + MinIO',            @sp, 'MEDIUM',   @u_own, @u_d2, DATEADD(day,3,GETDATE()),   16, 4,  DATEADD(day,-10,GETDATE()), GETDATE()),
        (@p, @s4, 'HRMS-25', N'AI assistant',                    N'Gemini integration',        @st, 'MEDIUM',   @u_own, NULL,  DATEADD(day,5,GETDATE()),   20, NULL,DATEADD(day,-9,GETDATE()),  GETDATE()),
        (@p, @s4, 'HRMS-26', N'Audit logging',                   N'Activity tracking',         @st, 'LOW',      @u_pm,  NULL,  DATEADD(day,7,GETDATE()),   8,  NULL,DATEADD(day,-8,GETDATE()),  GETDATE()),
        (@p, @s4, 'HRMS-27', N'Bug: Session timeout',            N'Fix token refresh',         @st, 'CRITICAL', @u_d1,  NULL,  DATEADD(day,1,GETDATE()),   4,  NULL,DATEADD(day,-7,GETDATE()),  GETDATE()),

        -- Backlog (no sprint)
        (@p, NULL, 'HRMS-28', N'Mobile responsive',              N'Responsive UI',             @st, 'MEDIUM',   @u_own, NULL,  NULL, 24, NULL, GETDATE(), GETDATE()),
        (@p, NULL, 'HRMS-29', N'Dark mode',                      N'Theme switching',           @st, 'LOW',      @u_pm,  NULL,  NULL, 16, NULL, GETDATE(), GETDATE()),
        (@p, NULL, 'HRMS-30', N'Multi-language i18n',            N'VN/EN support',             @st, 'LOW',      @u_own, NULL,  NULL, 40, NULL, GETDATE(), GETDATE());

    PRINT N'✅ 30 issues created (19 done, 2 in-progress, 1 review, 8 todo/backlog)';

    -- ── BỔ SUNG CÁC TRƯỜNG MỚI CHO ISSUE (start_date, weight, completed_at, rework_count, is_important, is_urgent)
    -- Update Done issues: set completed_at = due_date + 1 day (simulate completion on/before deadline)
    UPDATE issues SET completed_at = DATEADD(day, 1, due_date)
    WHERE project_id = @p AND status_id = @sd AND due_date IS NOT NULL;

    -- Sprint 1: Set weights (difficulty), rework counts, start_dates
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 7, rework_count = 1 WHERE issue_key = 'HRMS-1';
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 8, rework_count = 2 WHERE issue_key = 'HRMS-2';  -- Schema rework
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 9, rework_count = 0 WHERE issue_key = 'HRMS-3';  -- Critical, hard
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 6, rework_count = 0 WHERE issue_key = 'HRMS-4';
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 7, rework_count = 1 WHERE issue_key = 'HRMS-5';  -- Security rework
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 4, rework_count = 0 WHERE issue_key = 'HRMS-6';

    -- Sprint 2
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 7, rework_count = 1 WHERE issue_key = 'HRMS-7';
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 5, rework_count = 0 WHERE issue_key = 'HRMS-8';
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 5, rework_count = 0 WHERE issue_key = 'HRMS-9';
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 6, rework_count = 1 WHERE issue_key = 'HRMS-10';
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 8, rework_count = 2 WHERE issue_key = 'HRMS-11'; -- Multi-tenant hard
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 7, rework_count = 0 WHERE issue_key = 'HRMS-12';

    -- Sprint 3
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 7, rework_count = 0 WHERE issue_key = 'HRMS-13';
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 7, rework_count = 1 WHERE issue_key = 'HRMS-14';
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 9, rework_count = 0 WHERE issue_key = 'HRMS-15'; -- Critical salary
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 6, rework_count = 0 WHERE issue_key = 'HRMS-16';
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 6, rework_count = 0 WHERE issue_key = 'HRMS-17';
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 6, rework_count = 0 WHERE issue_key = 'HRMS-18';
    UPDATE issues SET start_date = DATEADD(day, -1, due_date), weight = 4, rework_count = 0 WHERE issue_key = 'HRMS-19';

    -- Sprint 4: mixed status - set start_dates and weights, is_important for critical ones
    UPDATE issues SET start_date = DATEADD(day, -7, GETDATE()), weight = 7, rework_count = 0 WHERE issue_key = 'HRMS-20';
    UPDATE issues SET start_date = DATEADD(day, -5, GETDATE()), weight = 5, rework_count = 0 WHERE issue_key = 'HRMS-21';
    UPDATE issues SET start_date = DATEADD(day, -3, GETDATE()), weight = 7, rework_count = 1 WHERE issue_key = 'HRMS-22'; -- Review, rework
    UPDATE issues SET start_date = DATEADD(day, -2, GETDATE()), weight = 8, rework_count = 0, is_important = 1 WHERE issue_key = 'HRMS-23'; -- High priority
    UPDATE issues SET start_date = DATEADD(day, -1, GETDATE()), weight = 6, rework_count = 0 WHERE issue_key = 'HRMS-24';
    UPDATE issues SET start_date = GETDATE(), weight = 5, rework_count = 0 WHERE issue_key = 'HRMS-25';  -- To Do
    UPDATE issues SET start_date = DATEADD(day, 2, GETDATE()), weight = 4, rework_count = 0 WHERE issue_key = 'HRMS-26'; -- To Do, future start
    UPDATE issues SET start_date = GETDATE(), weight = 8, rework_count = 0, is_important = 1, is_urgent = 1 WHERE issue_key = 'HRMS-27'; -- Critical bug, immediate

    -- Backlog: set weights and future start dates
    UPDATE issues SET start_date = DATEADD(day, 14, GETDATE()), weight = 6, rework_count = 0 WHERE issue_key = 'HRMS-28';
    UPDATE issues SET start_date = DATEADD(day, 21, GETDATE()), weight = 4, rework_count = 0 WHERE issue_key = 'HRMS-29';
    UPDATE issues SET start_date = DATEADD(day, 30, GETDATE()), weight = 5, rework_count = 0 WHERE issue_key = 'HRMS-30';

    PRINT N'✅ Issue metadata supplemented (start_date, weight, completed_at, rework_count, is_important, is_urgent)';
END
GO

-- =====================================================
-- 11. TIME LOGS (cho biểu đồ workload)
-- =====================================================
DECLARE @tl_d1 BIGINT, @tl_d2 BIGINT, @tl_d3 BIGINT;
SELECT @tl_d1 = user_id FROM users WHERE username = 'dev_a1';
SELECT @tl_d2 = user_id FROM users WHERE username = 'dev_a2';
SELECT @tl_d3 = user_id FROM users WHERE username = 'dev_a3';

IF NOT EXISTS (SELECT 1 FROM time_logs WHERE company_id = 1)
BEGIN
    INSERT INTO time_logs (issue_id, user_id, company_id, logged_hours, work_date, description, created_at, updated_at)
    SELECT i.issue_id, i.assignee_id, 1, i.actual_hours * 0.5, DATEADD(day, -7, GETDATE()), N'Development work', GETDATE(), GETDATE()
    FROM issues i WHERE i.project_id = (SELECT project_id FROM projects WHERE key_project = 'HRMS')
      AND i.assignee_id IS NOT NULL AND i.actual_hours IS NOT NULL AND i.actual_hours > 0;

    INSERT INTO time_logs (issue_id, user_id, company_id, logged_hours, work_date, description, created_at, updated_at)
    SELECT i.issue_id, i.assignee_id, 1, i.actual_hours * 0.5, DATEADD(day, -3, GETDATE()), N'Code review + testing', GETDATE(), GETDATE()
    FROM issues i WHERE i.project_id = (SELECT project_id FROM projects WHERE key_project = 'HRMS')
      AND i.assignee_id IS NOT NULL AND i.actual_hours IS NOT NULL AND i.actual_hours > 0;

    PRINT N'✅ Time logs created';
END
GO

-- =====================================================
-- 12. CALENDAR EVENTS
-- =====================================================
DECLARE @cal_own BIGINT, @cal_pm BIGINT;
SELECT @cal_own = user_id FROM users WHERE username = 'owner_a';
SELECT @cal_pm = user_id FROM users WHERE username = 'pm_a';

IF NOT EXISTS (SELECT 1 FROM calendar_events WHERE company_id = 1)
BEGIN
    INSERT INTO calendar_events (title, description, start_time, end_time, all_day, event_type, location, created_by, company_id, created_at, updated_at) VALUES
        (N'Sprint 4 Planning',      N'Lên kế hoạch sprint 4',     DATEADD(day,-14,GETDATE()), DATEADD(hour,2,DATEADD(day,-14,GETDATE())), 0, 'MEETING',  N'Phòng họp A',   @cal_own, 1, GETDATE(), GETDATE()),
        (N'Daily Standup',          N'Họp progress hàng ngày',    DATEADD(hour,9,GETDATE()),  DATEADD(minute,15,DATEADD(hour,9,GETDATE())),0, 'MEETING',  N'Google Meet',    @cal_pm,  1, GETDATE(), GETDATE()),
        (N'Sprint 4 Review',        N'Demo kết quả sprint 4',     DATEADD(day,1,GETDATE()),   DATEADD(hour,3,DATEADD(day,1,GETDATE())),    0, 'MEETING',  N'Phòng họp B',   @cal_own, 1, GETDATE(), GETDATE()),
        (N'HRMS-27 Deadline',       N'Fix session timeout',       DATEADD(day,1,GETDATE()),   DATEADD(day,1,GETDATE()),                    1, 'DEADLINE', NULL,              @cal_pm,  1, GETDATE(), GETDATE()),
        (N'Team Building Q1',       N'Hoạt động gắn kết team',    DATEADD(day,20,GETDATE()),  DATEADD(day,20,GETDATE()),                   1, 'OTHER',    N'Vũng Tàu',      @cal_own, 1, GETDATE(), GETDATE());
    PRINT N'✅ Calendar events created';
END
GO

-- =====================================================
-- 13. NOTIFICATIONS (sample)
-- =====================================================
DECLARE @n_own BIGINT, @n_pm BIGINT, @n_d1 BIGINT, @n_hr BIGINT;
SELECT @n_own = user_id FROM users WHERE username = 'owner_a';
SELECT @n_pm = user_id FROM users WHERE username = 'pm_a';
SELECT @n_d1 = user_id FROM users WHERE username = 'dev_a1';
SELECT @n_hr = user_id FROM users WHERE username = 'hr_a';

IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = @n_own)
BEGIN
    INSERT INTO notifications (user_id, type, title, content, link, is_read, created_at) VALUES
        (@n_own, 'TASK_ASSIGNED',   N'Task mới',            N'HRMS-27 cần xử lý gấp',      '/app/issues/HRMS-27',   0, DATEADD(hour,-2,GETDATE())),
        (@n_own, 'SPRINT_STARTED',  N'Sprint 4 bắt đầu',   N'Sprint 4 - Integration',      '/app/sprints',          1, DATEADD(day,-14,GETDATE())),
        (@n_pm,  'COMMENT_ADDED',   N'Comment mới',         N'dev_a1 comment trong HRMS-23','/app/issues/HRMS-23',   0, DATEADD(hour,-1,GETDATE())),
        (@n_d1,  'LEAVE_APPROVED',  N'Nghỉ phép đã duyệt', N'Đơn nghỉ phép được chấp nhận','/app/leave',            0, GETDATE()),
        (@n_hr,  'LEAVE_REQUEST',   N'Đơn nghỉ mới',       N'Có đơn nghỉ phép cần duyệt', '/app/leave/pending',    0, GETDATE());
    PRINT N'✅ Notifications created';
END
GO


-- =====================================================
-- 15. PROJECT PHASES & GOALS
-- =====================================================
DECLARE @p_hrms BIGINT;
SELECT @p_hrms = project_id FROM projects WHERE key_project = 'HRMS';
DECLARE @ow_a BIGINT;
SELECT @ow_a = user_id FROM users WHERE username = 'owner_a';

IF @p_hrms IS NOT NULL AND NOT EXISTS (SELECT 1 FROM project_phases WHERE project_id = @p_hrms)
BEGIN
    INSERT INTO project_phases (project_id, name, description, start_date, end_date, [status], order_index, created_by) VALUES
        (@p_hrms, N'Khởi tạo', N'Lập kế hoạch và thiết kế', DATEADD(month, -3, GETDATE()), DATEADD(month, -2, GETDATE()), 'COMPLETED', 1, @ow_a),
        (@p_hrms, N'Phát triển', N'Lập trình tính năng', DATEADD(month, -2, GETDATE()), DATEADD(day, 10, GETDATE()), 'IN_PROGRESS', 2, @ow_a),
        (@p_hrms, N'Kiểm thử', N'Test và fix bug', DATEADD(day, 11, GETDATE()), DATEADD(month, 1, GETDATE()), 'PLANNING', 3, @ow_a),
        (@p_hrms, N'Triển khai', N'Release version 1.0', DATEADD(month, 1, GETDATE()), DATEADD(month, 2, GETDATE()), 'PLANNING', 4, @ow_a);

    INSERT INTO project_goals (project_id, title, month_value, year_value, is_completed, created_at, updated_at) VALUES
        (@p_hrms, N'Hoàn thành API Đăng nhập', MONTH(DATEADD(month, -2, GETDATE())), YEAR(DATEADD(month, -2, GETDATE())), 1, GETDATE(), GETDATE()),
        (@p_hrms, N'Hoàn thành Module Nhân sự', MONTH(DATEADD(month, -1, GETDATE())), YEAR(DATEADD(month, -1, GETDATE())), 1, GETDATE(), GETDATE()),
        (@p_hrms, N'Tích hợp Chat Realtime', MONTH(GETDATE()), YEAR(GETDATE()), 0, GETDATE(), GETDATE());
    PRINT N'✅ Project phases and goals created';
END
GO

-- =====================================================
-- 16. RESOURCE ALLOCATIONS (Cho biểu đồ nhân sự)
-- =====================================================
DECLARE @proj_hrms BIGINT;
SELECT @proj_hrms = project_id FROM projects WHERE key_project = 'HRMS';

IF @proj_hrms IS NOT NULL AND NOT EXISTS (SELECT 1 FROM resource_allocations WHERE project_id = @proj_hrms)
BEGIN
    INSERT INTO resource_allocations (employee_id, project_id, start_date, end_date, allocation, note, company_id)
    SELECT e.employee_id, @proj_hrms, DATEADD(month, -2, GETDATE()), DATEADD(month, 1, GETDATE()), 
           CASE WHEN u.username = 'dev_a1' THEN 100 WHEN u.username = 'dev_a2' THEN 80 ELSE 50 END,
           N'Phân bổ cho dự án HRMS', 1
    FROM employees e JOIN users u ON e.user_id = u.user_id
    WHERE u.username IN ('dev_a1', 'dev_a2', 'dev_a3') AND e.company_id = 1;
    PRINT N'✅ Resource allocations created';
END
GO

-- =====================================================
-- 17. PROJECT EXPENSES (Cho biểu đồ chi phí)
-- =====================================================
DECLARE @proj_hrms BIGINT;
SELECT @proj_hrms = project_id FROM projects WHERE key_project = 'HRMS';
DECLARE @ow_a BIGINT;
SELECT @ow_a = user_id FROM users WHERE username = 'owner_a';

IF @proj_hrms IS NOT NULL AND NOT EXISTS (SELECT 1 FROM project_expenses WHERE project_id = @proj_hrms)
BEGIN
    INSERT INTO project_expenses (project_id, expense_name, amount, expense_date, description, created_by) VALUES
        (@proj_hrms, N'Chi phí Server AWS', 5000000, DATEADD(month, -2, GETDATE()), N'Thanh toán EC2 và RDS', @ow_a),
        (@proj_hrms, N'Bản quyền phần mềm', 2500000, DATEADD(month, -1, GETDATE()), N'Github Copilot và IDE', @ow_a),
        (@proj_hrms, N'Marketing Demo', 10000000, DATEADD(day, -5, GETDATE()), N'Chạy quảng cáo chiến dịch', @ow_a),
        (@proj_hrms, N'Thiết bị kiểm thử', 8000000, GETDATE(), N'Mua iPhone 15 để test app', @ow_a);
    PRINT N'✅ Project expenses created';
END
GO

-- =====================================================
-- 18. PERFORMANCE REVIEWS (Cho biểu đồ đánh giá)
-- =====================================================
DECLARE @proj_hrms BIGINT;
SELECT @proj_hrms = project_id FROM projects WHERE key_project = 'HRMS';
DECLARE @pm_a_emp BIGINT;
SELECT @pm_a_emp = employee_id FROM employees e JOIN users u ON e.user_id = u.user_id WHERE u.username = 'pm_a' AND e.company_id = 1;

IF @proj_hrms IS NOT NULL AND NOT EXISTS (SELECT 1 FROM reviews WHERE project_id = @proj_hrms)
BEGIN
    -- Review cho dev_a1 (Excellent)
    INSERT INTO reviews (employee_id, reviewer_id, project_id, project_name, review_period, review_type, technical_score, attitude_score, soft_skills_score, teamwork_score, total_score, rating, comments, status, completed_date)
    SELECT e.employee_id, @pm_a_emp, @proj_hrms, N'HR Management System', 'Q1-2026', 'PROJECT', 9.5, 9.0, 8.5, 9.5, 9.1, 'EXCELLENT', N'Hoàn thành xuất sắc nhiệm vụ', 'APPROVED', GETDATE()
    FROM employees e JOIN users u ON e.user_id = u.user_id WHERE u.username = 'dev_a1';

    -- Review cho dev_a2 (Good)
    INSERT INTO reviews (employee_id, reviewer_id, project_id, project_name, review_period, review_type, technical_score, attitude_score, soft_skills_score, teamwork_score, total_score, rating, comments, status, completed_date)
    SELECT e.employee_id, @pm_a_emp, @proj_hrms, N'HR Management System', 'Q1-2026', 'PROJECT', 8.0, 8.5, 8.0, 8.5, 8.2, 'GOOD', N'Kỹ năng tốt, cần cải thiện tiếng Anh', 'APPROVED', GETDATE()
    FROM employees e JOIN users u ON e.user_id = u.user_id WHERE u.username = 'dev_a2';

    -- Review cho dev_a3 (Average)
    INSERT INTO reviews (employee_id, reviewer_id, project_id, project_name, review_period, review_type, technical_score, attitude_score, soft_skills_score, teamwork_score, total_score, rating, comments, status, completed_date)
    SELECT e.employee_id, @pm_a_emp, @proj_hrms, N'HR Management System', 'Q1-2026', 'PROJECT', 7.0, 7.5, 7.0, 7.5, 7.2, 'AVERAGE', N'Cần nỗ lực hơn trong việc giữ deadline', 'APPROVED', GETDATE()
    FROM employees e JOIN users u ON e.user_id = u.user_id WHERE u.username = 'dev_a3';

    PRINT N'✅ Performance reviews created';
END
GO

-- =====================================================
-- DONE
-- =====================================================
PRINT N'';
PRINT N'=====================================================';
PRINT N'✅ SEED DATA COMPLETE!';
PRINT N'=====================================================';
PRINT N'';
PRINT N'📊 Data summary:';
PRINT N'  • 6 leave requests (approved/pending/rejected)';
PRINT N'  • 4 projects (3 Company A + 1 Company B)';
PRINT N'  • 5 sprints (3 completed + 1 active + 1 planning)';
PRINT N'  • 30 issues (velocity: S1=48h, S2=56h, S3=68h)';
PRINT N'  • Time logs, calendar, notifications';
PRINT N'  • Project phases, goals, resource allocations, expenses, reviews';
PRINT N'';
PRINT N'▶️ Tiếp theo: Chạy 03_indexes.sql';
GO

-- =====================================================
-- BỔ SUNG: GÁN DỮ LIỆU CHO full_emp ĐỂ TEST
-- =====================================================
DECLARE @uid_full BIGINT;
SELECT @uid_full = user_id FROM users WHERE username = 'full_emp';

IF @uid_full IS NOT NULL
BEGIN
    -- 1. Thêm full_emp vào Dự án HRMS (Dự án có nhiều dữ liệu nhất)
    IF NOT EXISTS (SELECT 1 FROM project_members WHERE project_id = 1 AND user_id = @uid_full)
    BEGIN
        INSERT INTO project_members (project_id, user_id, role, join_date, member_status, created_at, updated_at)
        VALUES (1, @uid_full, 'MANAGER', GETDATE(), 'ACTIVE', GETDATE(), GETDATE());
        PRINT N'✅ Đã thêm full_emp vào dự án HRMS (project_id = 1)';
    END

    -- 2. Giao 3 task ngẫu nhiên cho full_emp để test tab "Công việc của tôi"
    -- Cố gắng tìm task chưa có assignee
    UPDATE TOP (3) issues
    SET assignee_id = @uid_full, updated_at = GETDATE()
    WHERE project_id = 1 AND status_id IN (1, 2) AND assignee_id IS NULL;

    -- Nếu không có task nào trống thì lấy 3 task bất kỳ đang To Do / In Progress
    IF @@ROWCOUNT = 0
    BEGIN
        UPDATE TOP (3) issues
        SET assignee_id = @uid_full, updated_at = GETDATE()
        WHERE project_id = 1 AND status_id IN (1, 2);
    END
    PRINT N'✅ Đã giao 3 tasks trong HRMS cho full_emp';
END
GO

-- =====================================================
-- BỔ SUNG DATA ĐẦY ĐỦ CHO full_emp (Test User)
-- =====================================================
-- Mục tiêu: full_emp có task ở mọi trạng thái, time logs, reviews
-- =====================================================

USE DACN;
GO

DECLARE @uid_full BIGINT;
SELECT @uid_full = user_id FROM users WHERE username = 'full_emp';

IF @uid_full IS NOT NULL
BEGIN
    PRINT N'========== BỔ SUNG DATA CHO full_emp ==========';

    -- ── 1. TẠO EMPLOYEE RECORD CHO full_emp (cần có employee_id để tạo review)
    IF NOT EXISTS (SELECT 1 FROM employees WHERE user_id = @uid_full)
    BEGIN
        INSERT INTO employees (user_id, company_id, full_name, id_card, date_of_birth, gender, hire_date, [status], base_salary, allowance, created_at, updated_at)
        VALUES (
            @uid_full, 1,
            N'Full Employee',
            '0' + CAST(@uid_full + 123456789 AS VARCHAR),
            DATEADD(year, -25, GETDATE()),
            'MALE',
            DATEADD(month, -3, GETDATE()),
            'ACTIVE',
            18000000,
            2000000,
            GETDATE(), GETDATE()
        );
        PRINT N'✅ Employee record created for full_emp';
    END
    ELSE
        PRINT N'ℹ️  full_emp đã có employee record';

    DECLARE @emp_full BIGINT;
    SELECT @emp_full = employee_id FROM employees WHERE user_id = @uid_full;

    -- ── 2. THÊM full_emp VÀO CÁC PROJECT (ECOM, MOBI)
    DECLARE @ecom_proj2 BIGINT = (SELECT project_id FROM projects WHERE key_project = 'ECOM');
    DECLARE @mobi_proj BIGINT = (SELECT project_id FROM projects WHERE key_project = 'MOBI');

    IF NOT EXISTS (SELECT 1 FROM project_members WHERE user_id = @uid_full AND project_id = @ecom_proj2)
    BEGIN
        INSERT INTO project_members (project_id, user_id, [role], position, allocation_rate, member_status, join_date, created_at, updated_at)
        VALUES (@ecom_proj2, @uid_full, 'MEMBER', N'Full-stack Dev', 80, 'ACTIVE', GETDATE(), GETDATE(), GETDATE());
        PRINT N'✅ full_emp added to ECOM project';
    END

    IF NOT EXISTS (SELECT 1 FROM project_members WHERE user_id = @uid_full AND project_id = @mobi_proj)
    BEGIN
        INSERT INTO project_members (project_id, user_id, [role], position, allocation_rate, member_status, join_date, created_at, updated_at)
        VALUES (@mobi_proj, @uid_full, 'MEMBER', N'Mobile Dev', 50, 'ACTIVE', GETDATE(), GETDATE(), GETDATE());
        PRINT N'✅ full_emp added to MOBI project';
    END

    -- ── 3. GÁN TASK CHO full_emp - MỖI TRẠNG THÁI ÍT NHẤT 1 TASK
    -- Đếm xem full_emp đã có task ở mỗi trạng thái chưa
    DECLARE @todo_count INT, @prog_count INT, @rev_count INT, @done_count INT;
    SELECT @todo_count = COUNT(*) FROM issues WHERE assignee_id = @uid_full AND status_id = (SELECT status_id FROM issue_statuses WHERE name = 'To Do');
    SELECT @prog_count = COUNT(*) FROM issues WHERE assignee_id = @uid_full AND status_id = (SELECT status_id FROM issue_statuses WHERE name = 'In Progress');
    SELECT @rev_count  = COUNT(*) FROM issues WHERE assignee_id = @uid_full AND status_id = (SELECT status_id FROM issue_statuses WHERE name = 'Review');
    SELECT @done_count = COUNT(*) FROM issues WHERE assignee_id = @uid_full AND status_id = (SELECT status_id FROM issue_statuses WHERE name = 'Done');

    PRINT N'  current tasks → To Do: ' + CAST(@todo_count AS VARCHAR) + N', In Progress: ' + CAST(@prog_count AS VARCHAR) + N', Review: ' + CAST(@rev_count AS VARCHAR) + N', Done: ' + CAST(@done_count AS VARCHAR);

    -- Gán thêm task To Do (HRMS backlog chưa ai nhận)
    IF @todo_count < 2
    BEGIN
        UPDATE TOP (2) issues
        SET assignee_id = @uid_full, updated_at = GETDATE()
        WHERE project_id = (SELECT project_id FROM projects WHERE key_project = 'HRMS')
          AND status_id = (SELECT status_id FROM issue_statuses WHERE name = 'To Do')
          AND assignee_id IS NULL;
        PRINT N'✅ Assigned To Do tasks to full_emp';
    END

    -- Gán thêm task In Progress (HRMS Sprint 4 đang in-progress chưa ai nhận)
    IF @prog_count < 2
    BEGIN
        UPDATE TOP (2) issues
        SET assignee_id = @uid_full, updated_at = GETDATE()
        WHERE project_id = (SELECT project_id FROM projects WHERE key_project = 'HRMS')
          AND status_id = (SELECT status_id FROM issue_statuses WHERE name = 'In Progress')
          AND assignee_id IS NULL;
        PRINT N'✅ Assigned In Progress tasks to full_emp';
    END

    -- Gán task Review (HRMS-22 đang ở Review, cần reviewer)
    IF @rev_count < 1
    BEGIN
        UPDATE issues
        SET assignee_id = @uid_full, updated_at = GETDATE()
        WHERE project_id = (SELECT project_id FROM projects WHERE key_project = 'HRMS')
          AND status_id = (SELECT status_id FROM issue_statuses WHERE name = 'Review')
          AND assignee_id IS NULL;
        PRINT N'✅ Assigned Review task to full_emp';
    END

    -- Gán task Done từ Sprint 4 (các task đã done gán cho full_emp)
    IF @done_count < 3
    BEGIN
        UPDATE TOP (3) issues
        SET assignee_id = @uid_full, updated_at = GETDATE()
        WHERE project_id = (SELECT project_id FROM projects WHERE key_project = 'HRMS')
          AND status_id = (SELECT status_id FROM issue_statuses WHERE name = 'Done')
          AND assignee_id IS NULL;
        PRINT N'✅ Assigned Done tasks to full_emp';
    END

    -- ── 4. TẠO TASK MỚI DO full_emp LÀM REPORTER (test tab "Tôi tạo")
    -- Chỉ tạo nếu chưa tồn tại (idempotent - chạy lại không lỗi)
    DECLARE @hrms_proj BIGINT = (SELECT project_id FROM projects WHERE key_project = 'HRMS');
    DECLARE @ecom_proj BIGINT = (SELECT project_id FROM projects WHERE key_project = 'ECOM');
    DECLARE @st INT = (SELECT status_id FROM issue_statuses WHERE name = 'To Do');
    DECLARE @sp INT = (SELECT status_id FROM issue_statuses WHERE name = 'In Progress');
    DECLARE @sr INT = (SELECT status_id FROM issue_statuses WHERE name = 'Review');
    DECLARE @sd INT = (SELECT status_id FROM issue_statuses WHERE name = 'Done');
    -- Lấy số lớn nhất của HRMS-xxx (bỏ qua dấu '-')
    DECLARE @max_hrms_num BIGINT = (SELECT ISNULL(MAX(CAST(SUBSTRING(issue_key, CHARINDEX('-', issue_key) + 1, 10) AS INT)), 0) FROM issues WHERE project_id = @hrms_proj);
    DECLARE @max_ecom_num BIGINT = (SELECT ISNULL(MAX(CAST(SUBSTRING(issue_key, CHARINDEX('-', issue_key) + 1, 10) AS INT)), 0) FROM issues WHERE project_id = @ecom_proj);

    DECLARE @new_hrms_start BIGINT = @max_hrms_num + 1;
    DECLARE @new_ecom_start BIGINT = @max_ecom_num + 1;
    DECLARE @insert_count INT = 0;

    -- HRMS-31 → In Progress, do full_emp tạo và được giao
    IF NOT EXISTS (SELECT 1 FROM issues WHERE project_id = @hrms_proj AND issue_key = 'HRMS-' + CAST(@new_hrms_start AS VARCHAR))
    BEGIN
        INSERT INTO issues (project_id, issue_key, title, description, status_id, priority, reporter_id, assignee_id, due_date, start_date, estimated_hours, actual_hours, weight, rework_count, is_important, created_at, updated_at)
        VALUES (@hrms_proj, 'HRMS-' + CAST(@new_hrms_start AS VARCHAR), N'Thiết kế API notification service', N'Xây dựng service gửi notification real-time qua WebSocket', @sp, 'HIGH', @uid_full, @uid_full, DATEADD(day, 7, GETDATE()), DATEADD(day, -2, GETDATE()), 16, 4, 7, 0, 0, GETDATE(), GETDATE());
        SET @insert_count = @insert_count + 1;
    END

    -- HRMS-32 → In Progress, do full_emp tạo và được giao
    IF NOT EXISTS (SELECT 1 FROM issues WHERE project_id = @hrms_proj AND issue_key = 'HRMS-' + CAST(@new_hrms_start + 1 AS VARCHAR))
    BEGIN
        INSERT INTO issues (project_id, issue_key, title, description, status_id, priority, reporter_id, assignee_id, due_date, start_date, estimated_hours, actual_hours, weight, rework_count, created_at, updated_at)
        VALUES (@hrms_proj, 'HRMS-' + CAST(@new_hrms_start + 1 AS VARCHAR), N'Integration test cho auth module', N'Viết unit test + integration test cho JWT flow', @sp, 'HIGH', @uid_full, @uid_full, DATEADD(day, 5, GETDATE()), DATEADD(day, -1, GETDATE()), 12, 6, 6, 0, GETDATE(), GETDATE());
        SET @insert_count = @insert_count + 1;
    END

    -- HRMS-33 → Review, do full_emp tạo và được giao
    IF NOT EXISTS (SELECT 1 FROM issues WHERE project_id = @hrms_proj AND issue_key = 'HRMS-' + CAST(@new_hrms_start + 2 AS VARCHAR))
    BEGIN
        INSERT INTO issues (project_id, issue_key, title, description, status_id, priority, reporter_id, assignee_id, due_date, start_date, estimated_hours, actual_hours, weight, rework_count, completed_at, created_at, updated_at)
        VALUES (@hrms_proj, 'HRMS-' + CAST(@new_hrms_start + 2 AS VARCHAR), N'Optimize database query performance', N'Tuning các câu query chậm trong report module', @sr, 'MEDIUM', @uid_full, @uid_full, DATEADD(day, 3, GETDATE()), DATEADD(day, -3, GETDATE()), 8, 7, 6, 0, DATEADD(day, -1, GETDATE()), GETDATE(), GETDATE());
        SET @insert_count = @insert_count + 1;
    END

    -- HRMS-34 → Done, do full_emp tạo và được giao (completed before deadline → bonus)
    IF NOT EXISTS (SELECT 1 FROM issues WHERE project_id = @hrms_proj AND issue_key = 'HRMS-' + CAST(@new_hrms_start + 3 AS VARCHAR))
    BEGIN
        INSERT INTO issues (project_id, issue_key, title, description, status_id, priority, reporter_id, assignee_id, due_date, start_date, estimated_hours, actual_hours, weight, rework_count, completed_at, created_at, updated_at)
        VALUES (@hrms_proj, 'HRMS-' + CAST(@new_hrms_start + 3 AS VARCHAR), N'Setup CI/CD pipeline cho BE', N'Cấu hình GitHub Actions build + deploy tự động', @sd, 'HIGH', @uid_full, @uid_full, DATEADD(day, -5, GETDATE()), DATEADD(day, -8, GETDATE()), 10, 9, 7, 1, DATEADD(day, -6, GETDATE()), GETDATE(), GETDATE());
        SET @insert_count = @insert_count + 1;
    END

    -- HRMS-35 → To Do (backlog), do full_emp tạo, chưa gán ai
    IF NOT EXISTS (SELECT 1 FROM issues WHERE project_id = @hrms_proj AND issue_key = 'HRMS-' + CAST(@new_hrms_start + 4 AS VARCHAR))
    BEGIN
        INSERT INTO issues (project_id, issue_key, title, description, status_id, priority, reporter_id, assignee_id, due_date, start_date, estimated_hours, weight, created_at, updated_at)
        VALUES (@hrms_proj, 'HRMS-' + CAST(@new_hrms_start + 4 AS VARCHAR), N'Implement export Excel cho reports', N'Xuất báo cáo ra file Excel với Apache POI', @st, 'LOW', @uid_full, NULL, DATEADD(day, 14, GETDATE()), DATEADD(day, 14, GETDATE()), 8, 5, GETDATE(), GETDATE());
        SET @insert_count = @insert_count + 1;
    END

    -- ECOM task do full_emp tạo (để test cross-project)
    IF NOT EXISTS (SELECT 1 FROM issues WHERE project_id = @ecom_proj AND issue_key = 'ECOM-' + CAST(@new_ecom_start AS VARCHAR))
    BEGIN
        INSERT INTO issues (project_id, issue_key, title, description, status_id, priority, reporter_id, assignee_id, due_date, start_date, estimated_hours, actual_hours, weight, rework_count, created_at, updated_at)
        VALUES (@ecom_proj, 'ECOM-' + CAST(@new_ecom_start AS VARCHAR), N'Design cart checkout flow', N'Thiết kế UI/UX cho trang thanh toán', @sp, 'HIGH', @uid_full, @uid_full, DATEADD(day, 6, GETDATE()), DATEADD(day, -1, GETDATE()), 20, 8, 6, 0, GETDATE(), GETDATE());
        SET @insert_count = @insert_count + 1;
    END

    PRINT N'✅ Created ' + CAST(@insert_count AS VARCHAR) + N' new issues (reported by full_emp) across HRMS and ECOM';

    -- ── 5. TẠO TIME LOGS CHO full_emp (bảng time_logs)
    -- Chỉ tạo nếu chưa có (idempotent - không xóa data cũ)
    IF NOT EXISTS (SELECT 1 FROM time_logs WHERE user_id = @uid_full)
    BEGIN
        -- Tạo time log dựa trên issues có assignee_id = full_emp và có estimated_hours
        -- Log ngày hôm nay - 1
        INSERT INTO time_logs (issue_id, user_id, company_id, logged_hours, work_date, description, created_at, updated_at)
        SELECT i.issue_id, @uid_full, 1, 1.0, CAST(DATEADD(day, -1, GETDATE()) AS DATE), N'Development work', GETDATE(), GETDATE()
        FROM issues i WHERE i.assignee_id = @uid_full AND i.estimated_hours IS NOT NULL AND i.status_id IN (@sp, @sr, @sd);

        -- Log ngày hôm nay - 2
        INSERT INTO time_logs (issue_id, user_id, company_id, logged_hours, work_date, description, created_at, updated_at)
        SELECT i.issue_id, @uid_full, 1, 2.0, CAST(DATEADD(day, -2, GETDATE()) AS DATE), N'Coding + debugging', GETDATE(), GETDATE()
        FROM issues i WHERE i.assignee_id = @uid_full AND i.estimated_hours IS NOT NULL AND i.status_id IN (@sp, @sr, @sd);

        -- Log ngày hôm nay - 3 (chỉ Review/Done)
        INSERT INTO time_logs (issue_id, user_id, company_id, logged_hours, work_date, description, created_at, updated_at)
        SELECT i.issue_id, @uid_full, 1, 3.0, CAST(DATEADD(day, -3, GETDATE()) AS DATE), N'Code review + testing', GETDATE(), GETDATE()
        FROM issues i WHERE i.assignee_id = @uid_full AND i.estimated_hours IS NOT NULL AND i.status_id IN (@sr, @sd);

        -- Log ngày hôm nay - 5 (chỉ Done)
        INSERT INTO time_logs (issue_id, user_id, company_id, logged_hours, work_date, description, created_at, updated_at)
        SELECT i.issue_id, @uid_full, 1, 4.0, CAST(DATEADD(day, -5, GETDATE()) AS DATE), N'Final polish + merge PR', GETDATE(), GETDATE()
        FROM issues i WHERE i.assignee_id = @uid_full AND i.estimated_hours IS NOT NULL AND i.status_id = @sd;

        -- Log ngày hôm nay - 7 (chỉ Done)
        INSERT INTO time_logs (issue_id, user_id, company_id, logged_hours, work_date, description, created_at, updated_at)
        SELECT i.issue_id, @uid_full, 1, 3.0, CAST(DATEADD(day, -7, GETDATE()) AS DATE), N'Feature implementation', GETDATE(), GETDATE()
        FROM issues i WHERE i.assignee_id = @uid_full AND i.estimated_hours IS NOT NULL AND i.status_id = @sd;

        -- Cập nhật actual_hours trên issues dựa trên SUM của time_logs
        UPDATE i SET i.actual_hours = ISNULL(t.total_hours, i.actual_hours)
        FROM issues i
        INNER JOIN (
            SELECT issue_id, SUM(logged_hours) AS total_hours
            FROM time_logs
            WHERE user_id = @uid_full
            GROUP BY issue_id
        ) t ON i.issue_id = t.issue_id;

        PRINT N'✅ Created time logs for full_emp (5 entries across past week)';
    END
    ELSE
        PRINT N'ℹ️  full_emp already has time logs - skipped';

    -- ── 6. TẠO PERFORMANCE REVIEWS CHO full_emp
    -- Chỉ tạo nếu chưa có review nào cho full_emp (idempotent)
    IF NOT EXISTS (SELECT 1 FROM reviews WHERE employee_id = @emp_full)
    BEGIN
        DECLARE @pm_a_emp BIGINT;
        SELECT @pm_a_emp = employee_id FROM employees WHERE user_id = (SELECT user_id FROM users WHERE username = 'pm_a');

        DECLARE @hrms_proj_id BIGINT = (SELECT project_id FROM projects WHERE key_project = 'HRMS');
        DECLARE @ecom_proj_id BIGINT = (SELECT project_id FROM projects WHERE key_project = 'ECOM');

        -- Review Q1 2026 - EXCELLENT (project: HRMS)
        INSERT INTO reviews (employee_id, reviewer_id, project_id, project_name, review_period, review_type, technical_score, attitude_score, soft_skills_score, teamwork_score, total_score, rating, comments, status, completed_date, start_date, end_date, created_at, updated_at)
        VALUES (
            @emp_full, @pm_a_emp, @hrms_proj_id,
            N'HR Management System',
            'Q1-2026', 'PROJECT',
            9.0, 8.5, 9.0, 9.5,
            9.0,
            'EXCELLENT',
            N'Hoàn thành xuất sắc các task được giao. Chất lượng code tốt, commit đều đặn.',
            'APPROVED',
            DATEADD(day, -10, GETDATE()),
            DATEADD(day, -90, GETDATE()),
            DATEADD(day, -1, GETDATE()),
            GETDATE(), GETDATE()
        );

        -- Review Q2 2026 - GOOD (project: ECOM)
        INSERT INTO reviews (employee_id, reviewer_id, project_id, project_name, review_period, review_type, technical_score, attitude_score, soft_skills_score, teamwork_score, total_score, rating, comments, status, completed_date, start_date, end_date, created_at, updated_at)
        VALUES (
            @emp_full, @pm_a_emp, @ecom_proj_id,
            N'E-Commerce Platform',
            'Q2-2026', 'PROJECT',
            8.5, 8.0, 8.0, 8.5,
            8.3,
            'GOOD',
            N'Làm việc tốt, cần cải thiện tốc độ hoàn thành task. Giao tiếp kém hơn Q1.',
            'APPROVED',
            GETDATE(),
            DATEADD(day, -89, GETDATE()),
            GETDATE(),
            GETDATE(), GETDATE()
        );

        -- Review periodic - IN_PROGRESS (chưa review)
        INSERT INTO reviews (employee_id, reviewer_id, project_id, project_name, review_period, review_type, technical_score, attitude_score, soft_skills_score, teamwork_score, total_score, rating, comments, status, start_date, end_date, created_at, updated_at)
        VALUES (
            @emp_full, @pm_a_emp, @hrms_proj_id,
            N'HR Management System',
            'May-2026', 'PERIODIC',
            NULL, NULL, NULL, NULL,
            NULL, NULL,
            NULL,
            'IN_PROGRESS',
            DATEADD(day, -1, GETDATE()),
            DATEADD(day, 29, GETDATE()),
            GETDATE(), GETDATE()
        );

        PRINT N'✅ Created 3 performance reviews for full_emp (Q1-EXCELLENT, Q2-GOOD, May-IN_PROGRESS)';
    END
    ELSE
        PRINT N'ℹ️  full_emp already has reviews - skipped';

    -- ── 7. TẠO NOTIFICATIONS CHO full_emp
    -- Chỉ tạo nếu chưa có notification nào (idempotent)
    IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = @uid_full)
    BEGIN
        INSERT INTO notifications (user_id, type, title, content, link, is_read, created_at) VALUES
            (@uid_full, 'TASK_ASSIGNED', N'Task mới được giao', N'Bạn được giao task "Thiết kế API notification service"', '/app/me/issues', 0, DATEADD(hour, -1, GETDATE())),
            (@uid_full, 'TASK_ASSIGNED', N'Task mới được giao', N'Bạn được giao task "Integration test cho auth module"', '/app/me/issues', 0, DATEADD(day, -1, GETDATE())),
            (@uid_full, 'TASK_REVIEW_REQUEST', N'Yêu cầu review', N'Task "Optimize DB performance" cần được review', '/app/me/issues', 0, DATEADD(day, -2, GETDATE())),
            (@uid_full, 'REVIEW_SUBMITTED', N'Review Q2 được duyệt', N'PM đã duyệt review Q2-2026 của bạn - Đánh giá GOOD', '/app/me/performance', 1, DATEADD(day, -3, GETDATE())),
            (@uid_full, 'DEADLINE_APPROACHING', N'Deadline sắp đến', N'Task "Integration test" sẽ hết hạn trong 5 ngày', '/app/me/issues', 0, GETDATE());
        PRINT N'✅ Created 5 notifications for full_emp';
    END
    ELSE
        PRINT N'ℹ️  full_emp already has notifications - skipped';

    -- ── 8. TẠO CALENDAR EVENTS CHO full_emp
    -- Chỉ tạo nếu chưa có event nào (idempotent)
    IF NOT EXISTS (SELECT 1 FROM calendar_events WHERE created_by = @uid_full)
    BEGIN
        INSERT INTO calendar_events (title, description, start_time, end_time, all_day, event_type, location, created_by, company_id, created_at, updated_at) VALUES
            (N'Sprint 5 Planning', N'Thảo luận kế hoạch Sprint 5', DATEADD(day, 2, GETDATE()), DATEADD(hour, 3, DATEADD(day, 2, GETDATE())), 0, 'MEETING', N'Google Meet', @uid_full, 1, GETDATE(), GETDATE()),
            (N'Review HRMS-33', N'Review code task Optimize DB Performance', DATEADD(day, 3, GETDATE()), DATEADD(hour, 1, DATEADD(day, 3, GETDATE())), 0, 'MEETING', N'Phòng họp A', @uid_full, 1, GETDATE(), GETDATE()),
            (N'HRMS-31 Deadline', N'Task notification service sắp hết hạn', DATEADD(day, 7, GETDATE()), DATEADD(day, 7, GETDATE()), 1, 'DEADLINE', NULL, @uid_full, 1, GETDATE(), GETDATE());
        PRINT N'✅ Created 3 calendar events for full_emp';
    END
    ELSE
        PRINT N'ℹ️  full_emp already has calendar events - skipped';

    -- ── 9. TẠO TASK QUÁ HẠN (OVERDUE) CHO full_emp
    -- Chỉ tạo nếu chưa tồn tại (idempotent)
    DECLARE @overdue_key VARCHAR(50) = 'HRMS-' + CAST(@max_hrms_num + 6 AS VARCHAR);
    IF NOT EXISTS (SELECT 1 FROM issues WHERE project_id = @hrms_proj AND issue_key = @overdue_key)
    BEGIN
        INSERT INTO issues (project_id, issue_key, title, description, status_id, priority, reporter_id, assignee_id, due_date, start_date, estimated_hours, actual_hours, weight, rework_count, is_important, is_urgent, created_at, updated_at)
        VALUES (
            @hrms_proj,
            @overdue_key,
            N'Hotfix lỗi bảo mật JWT refresh token',
            N'Phát hiện lỗ hổng bảo mật trong JWT refresh flow cần fix gấp',
            @sp, 'CRITICAL', @uid_full, @uid_full,
            DATEADD(day, -3, GETDATE()), -- Đã quá hạn 3 ngày
            DATEADD(day, -5, GETDATE()), -- Đã bắt đầu 5 ngày trước
            8, 10,
            8, 1,  -- weight=8 (khó), rework=1 (đã fix 1 lần)
            1, 1,  -- is_important=1, is_urgent=1 (Làm ngay!)
            GETDATE(), GETDATE()
        );
        PRINT N'✅ Created 1 overdue + urgent task for full_emp (SLA breach test)';
    END
    ELSE
        PRINT N'ℹ️  full_emp overdue task already exists - skipped';

    -- ── FINAL SUMMARY
    PRINT N'';
    PRINT N'========== DATA FULL_EMP SUMMARY ==========';
    SELECT @todo_count = COUNT(*) FROM issues WHERE assignee_id = @uid_full AND status_id = @st;
    SELECT @prog_count = COUNT(*) FROM issues WHERE assignee_id = @uid_full AND status_id = @sp;
    SELECT @rev_count  = COUNT(*) FROM issues WHERE assignee_id = @uid_full AND status_id = @sr;
    SELECT @done_count = COUNT(*) FROM issues WHERE assignee_id = @uid_full AND status_id = @sd;

    DECLARE @rep_count INT = (SELECT COUNT(*) FROM issues WHERE reporter_id = @uid_full);
    DECLARE @tl_count  INT = (SELECT COUNT(*) FROM time_logs WHERE user_id = @uid_full);
    DECLARE @rev2_count INT = (SELECT COUNT(*) FROM reviews WHERE employee_id = @emp_full);
    DECLARE @notif_count INT = (SELECT COUNT(*) FROM notifications WHERE user_id = @uid_full);
    DECLARE @cal_count  INT = (SELECT COUNT(*) FROM calendar_events WHERE created_by = @uid_full);
    DECLARE @pm_count   INT = (SELECT COUNT(*) FROM project_members WHERE user_id = @uid_full);

    PRINT N'  Tasks assigned: To Do=' + CAST(@todo_count AS VARCHAR)
            + N', In Progress=' + CAST(@prog_count AS VARCHAR)
            + N', Review=' + CAST(@rev_count AS VARCHAR)
            + N', Done=' + CAST(@done_count AS VARCHAR);
    PRINT N'  Tasks reported (I created): ' + CAST(@rep_count AS VARCHAR);
    PRINT N'  Time logs: ' + CAST(@tl_count AS VARCHAR);
    PRINT N'  Reviews: ' + CAST(@rev2_count AS VARCHAR);
    PRINT N'  Notifications: ' + CAST(@notif_count AS VARCHAR);
    PRINT N'  Calendar events: ' + CAST(@cal_count AS VARCHAR);
    PRINT N'  Projects joined: ' + CAST(@pm_count AS VARCHAR);
    PRINT N'===========================================';
    PRINT N'✅ ALL DATA SUPPLEMENTED FOR full_emp!';
END
ELSE
BEGIN
    PRINT N'⚠️  full_emp user not found in database';
END
GO

-- =====================================================
-- BỔ SUNG: GÁN ISSUES VÀO SPRINT 5 (PLANNING)
-- Mục tiêu: Sprint 5 hiển thị data thay vì 0 issues
-- =====================================================
DECLARE @hrms_p BIGINT, @s5 BIGINT;
SELECT @hrms_p = project_id FROM projects WHERE key_project = 'HRMS';
SELECT @s5 = sprint_id FROM sprints WHERE name LIKE 'Sprint 5%' AND project_id = @hrms_p;

IF @s5 IS NOT NULL
BEGIN
    -- Gán tất cả issue thuộc HRMS mà chưa có sprint (backlog) vào Sprint 5
    UPDATE issues
    SET sprint_id = @s5, updated_at = GETDATE()
    WHERE project_id = @hrms_p
      AND sprint_id IS NULL;

    DECLARE @assigned_count INT = @@ROWCOUNT;
    PRINT N'✅ Assigned ' + CAST(@assigned_count AS VARCHAR) + N' backlog issues to Sprint 5 (Planning)';
END
ELSE
    PRINT N'⚠️  Sprint 5 not found - skipping issue assignment';
GO

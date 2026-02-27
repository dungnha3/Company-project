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
-- 1. DEPARTMENTS (Company A)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM departments WHERE company_id = 1)
BEGIN
    INSERT INTO departments (name, description, company_id, created_at, updated_at) VALUES
        (N'Phòng Công nghệ',   N'Software Development & IT',       1, GETDATE(), GETDATE()),
        (N'Phòng Nhân sự',     N'Human Resources Management',      1, GETDATE(), GETDATE()),
        (N'Phòng Kinh doanh',  N'Sales & Business Development',    1, GETDATE(), GETDATE()),
        (N'Phòng Tài chính',   N'Finance & Accounting',            1, GETDATE(), GETDATE()),
        (N'Phòng Marketing',   N'Marketing & Communications',      1, GETDATE(), GETDATE());
    PRINT N'✅ Departments created';
END

-- =====================================================
-- 2. POSITIONS
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM positions)
BEGIN
    INSERT INTO positions (name, salary_coefficient, [level], created_at, updated_at) VALUES
        (N'Giám đốc',          4.0, 5, GETDATE(), GETDATE()),
        (N'Trưởng phòng',      3.0, 4, GETDATE(), GETDATE()),
        (N'Team Lead',          2.5, 3, GETDATE(), GETDATE()),
        (N'Senior Developer',   2.0, 3, GETDATE(), GETDATE()),
        (N'Developer',          1.5, 2, GETDATE(), GETDATE()),
        (N'Junior Developer',   1.2, 1, GETDATE(), GETDATE()),
        (N'Thực tập sinh',     0.8, 1, GETDATE(), GETDATE());
    PRINT N'✅ Positions created';
END
GO

-- =====================================================
-- 3. EMPLOYEES (Company A)
-- =====================================================
DECLARE @dept_it BIGINT, @dept_hr BIGINT, @dept_fin BIGINT;
DECLARE @pos_lead BIGINT, @pos_senior BIGINT, @pos_dev BIGINT;
SELECT TOP 1 @dept_it = department_id FROM departments WHERE name LIKE N'%Công nghệ%' AND company_id = 1;
SELECT TOP 1 @dept_hr = department_id FROM departments WHERE name LIKE N'%Nhân sự%' AND company_id = 1;
SELECT TOP 1 @dept_fin = department_id FROM departments WHERE name LIKE N'%Tài chính%' AND company_id = 1;
SELECT TOP 1 @pos_lead = position_id FROM positions WHERE name = N'Team Lead';
SELECT TOP 1 @pos_senior = position_id FROM positions WHERE name = N'Senior Developer';
SELECT TOP 1 @pos_dev = position_id FROM positions WHERE name = N'Developer';

INSERT INTO employees (user_id, company_id, department_id, position_id, full_name, id_card, date_of_birth, gender, hire_date, [status], base_salary, allowance, created_at, updated_at)
SELECT u.user_id, 1,
    CASE
        WHEN u.username LIKE 'hr%' THEN @dept_hr
        WHEN u.username LIKE 'acc%' THEN @dept_fin
        ELSE @dept_it
    END,
    CASE
        WHEN u.username LIKE 'owner%' OR u.username LIKE 'pm%' THEN @pos_lead
        WHEN u.username LIKE 'dev%' THEN @pos_senior
        ELSE @pos_dev
    END,
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
-- 4. ATTENDANCES (30 ngày gần nhất - richdata cho biểu đồ)
-- =====================================================
DECLARE @i INT = 0, @date DATE;
WHILE @i < 30
BEGIN
    SET @date = DATEADD(day, -@i, CAST(GETDATE() AS DATE));
    IF DATEPART(dw, @date) BETWEEN 2 AND 6
    BEGIN
        INSERT INTO attendances (employee_id, company_id, attendance_date, check_in_time, check_out_time, working_hours, [status], check_in_method, shift_type, created_at, updated_at)
        SELECT
            e.employee_id, 1, @date,
            DATEADD(minute, (e.employee_id % 30) - 15, CAST('08:00:00' AS TIME)),
            DATEADD(minute, (e.employee_id % 20), CAST('17:30:00' AS TIME)),
            8.0,
            CASE
                WHEN @i % 7 = 0 AND e.employee_id % 3 = 0 THEN 'LATE'
                WHEN @i % 10 = 0 AND e.employee_id % 5 = 0 THEN 'EARLY_LEAVE'
                ELSE 'FULL_DAY'
            END,
            'MANUAL', 'FULL',
            GETDATE(), GETDATE()
        FROM employees e WHERE e.company_id = 1
          AND NOT EXISTS (SELECT 1 FROM attendances a WHERE a.employee_id = e.employee_id AND a.attendance_date = @date);
    END
    SET @i = @i + 1;
END
PRINT N'✅ 30 days of attendance data created';
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
-- 6. SALARIES (3 tháng gần nhất - cho biểu đồ lương)
-- =====================================================
DECLARE @month_offset INT = 0;
WHILE @month_offset < 3
BEGIN
    DECLARE @sal_month INT = MONTH(DATEADD(month, -@month_offset, GETDATE()));
    DECLARE @sal_year INT = YEAR(DATEADD(month, -@month_offset, GETDATE()));

    INSERT INTO salaries (employee_id, company_id, [month], [year], base_salary, allowance, working_days, standard_working_days, gross_salary, net_salary, payment_status, created_at, updated_at)
    SELECT
        e.employee_id, 1, @sal_month, @sal_year,
        e.base_salary, ISNULL(e.allowance, 0),
        CASE WHEN @month_offset = 0 THEN 18 ELSE 22 END,
        26,
        e.base_salary + ISNULL(e.allowance, 0),
        (e.base_salary + ISNULL(e.allowance, 0)) * 0.895,
        CASE WHEN @month_offset > 0 THEN 'PAID' ELSE 'UNPAID' END,
        GETDATE(), GETDATE()
    FROM employees e WHERE e.company_id = 1
      AND NOT EXISTS (SELECT 1 FROM salaries s WHERE s.employee_id = e.employee_id AND s.[year] = @sal_year AND s.[month] = @sal_month);

    SET @month_offset = @month_offset + 1;
END
PRINT N'✅ 3 months salary data created';
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
-- 14. CHAT ROOMS + MEMBERS
-- =====================================================
DECLARE @ch_own BIGINT, @ch_pm BIGINT, @ch_d1 BIGINT, @ch_d2 BIGINT;
SELECT @ch_own = user_id FROM users WHERE username = 'owner_a';
SELECT @ch_pm = user_id FROM users WHERE username = 'pm_a';
SELECT @ch_d1 = user_id FROM users WHERE username = 'dev_a1';
SELECT @ch_d2 = user_id FROM users WHERE username = 'dev_a2';

IF NOT EXISTS (SELECT 1 FROM chat_rooms WHERE company_id = 1)
BEGIN
    INSERT INTO chat_rooms (name, [type], company_id, created_by, created_at, updated_at) VALUES
        (N'General',    'GROUP', 1, @ch_own, GETDATE(), GETDATE()),
        (N'Dev Team',   'GROUP', 1, @ch_pm,  GETDATE(), GETDATE());
    PRINT N'✅ Chat rooms created';
END
GO

-- =====================================================
-- 15. PERSONAL WORKSPACES + TASKS
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM personal_workspaces)
BEGIN
    INSERT INTO personal_workspaces (user_id, name, created_at)
    SELECT user_id, username + '_workspace', GETDATE()
    FROM users WHERE is_deleted = 0
      AND NOT EXISTS (SELECT 1 FROM personal_workspaces pw WHERE pw.user_id = users.user_id);
    PRINT N'✅ Personal workspaces created';
END
GO

DECLARE @ws_own BIGINT;
SELECT TOP 1 @ws_own = workspace_id FROM personal_workspaces pw JOIN users u ON pw.user_id = u.user_id WHERE u.username = 'owner_a';

IF @ws_own IS NOT NULL AND NOT EXISTS (SELECT 1 FROM personal_tasks WHERE workspace_id = @ws_own)
BEGIN
    INSERT INTO personal_tasks (workspace_id, title, description, due_date, status, priority, reminder_sent, created_at, updated_at) VALUES
        (@ws_own, N'Review PRs',           N'Review merge requests từ team',  DATEADD(day,1,GETDATE()), 'TODO',        'HIGH',   0, GETDATE(), GETDATE()),
        (@ws_own, N'Chuẩn bị demo',       N'Slides cho sprint review',       DATEADD(day,3,GETDATE()), 'TODO',        'MEDIUM', 0, GETDATE(), GETDATE()),
        (@ws_own, N'Cập nhật docs',        N'Update API documentation',       DATEADD(day,7,GETDATE()), 'IN_PROGRESS', 'LOW',    0, GETDATE(), GETDATE());
    PRINT N'✅ Personal tasks created';
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
PRINT N'  • 5 departments, 7 positions';
PRINT N'  • 30 days attendance data';
PRINT N'  • 3 months salary data';
PRINT N'  • 6 leave requests (approved/pending/rejected)';
PRINT N'  • 4 projects (3 Company A + 1 Company B)';
PRINT N'  • 5 sprints (3 completed + 1 active + 1 planning)';
PRINT N'  • 30 issues (velocity: S1=48h, S2=56h, S3=68h)';
PRINT N'  • Time logs, calendar, notifications, chat';
PRINT N'';
PRINT N'▶️ Tiếp theo: Chạy 03_indexes.sql';
GO

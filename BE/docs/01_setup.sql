-- =====================================================
-- GEMINI ERP - SETUP SCRIPT
-- File: 01_setup.sql
-- Tạo users, companies (4 gói khác nhau), settings
-- Chạy SAU KHI app đã tạo tables (start app 1 lần rồi tắt)
-- =====================================================

USE DACN;
GO

-- FIX: Sửa role 'ADMIN' → 'COMPANY_ADMIN' nếu data cũ còn dùng sai tên
-- (Java enum là COMPANY_ADMIN, không phải ADMIN)
-- Phải drop CHECK constraint trước vì constraint cũ chỉ cho phép 'ADMIN'
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'company_member_roles')
BEGIN
    -- Drop CHECK constraint trên cột role (tên constraint có thể khác nhau mỗi DB)
    DECLARE @constraintName NVARCHAR(200);
    SELECT @constraintName = cc.CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE cc
    JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS ck ON cc.CONSTRAINT_NAME = ck.CONSTRAINT_NAME
    WHERE cc.TABLE_NAME = 'company_member_roles' AND cc.COLUMN_NAME = 'role';

    IF @constraintName IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE company_member_roles DROP CONSTRAINT ' + @constraintName);
        PRINT N'⚠️ Dropped old CHECK constraint: ' + @constraintName;
    END

    -- Update role values
    UPDATE company_member_roles SET [role] = 'COMPANY_ADMIN' WHERE [role] = 'ADMIN';
    IF @@ROWCOUNT > 0 PRINT N'✅ Fixed ADMIN → COMPANY_ADMIN in company_member_roles';

    -- Tạo lại CHECK constraint với đúng enum values
    ALTER TABLE company_member_roles ADD CONSTRAINT CK_company_member_roles_role
        CHECK ([role] IN ('OWNER','COMPANY_ADMIN','EMPLOYEE'));
    PRINT N'✅ Recreated CHECK constraint with correct enum values';
END
GO

-- FIX: Cập nhật permissions cho hr_a (HR + Project) và pm_a (PM + HR view)
-- Roles giờ chỉ có OWNER, COMPANY_ADMIN, EMPLOYEE. Permissions tùy chỉnh qua JSON.
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'company_members')
BEGIN
    -- hr_a: EMPLOYEE + custom HR & Project permissions
    UPDATE cm SET cm.permissions = '{"hrViewList":true,"hrEditProfile":true,"hrCreateEmployee":true,"hrDeleteEmployee":true,"hrManageContracts":true,"hrManageReviews":true,"hrViewDepartments":true,"hrManageDepartments":true,"hrViewPositions":true,"hrManagePositions":true,"hrViewDashboard":true,"hrExport":true,"projectCreate":true,"projectManageIssues":true,"projectViewDashboard":true}'
    FROM company_members cm JOIN users u ON cm.user_id = u.user_id
    WHERE u.username = 'hr_a' AND cm.company_id = 1;

    -- pm_a: EMPLOYEE + custom Project & HR view permissions
    UPDATE cm SET cm.permissions = '{"projectCreate":true,"projectManageAll":true,"projectDelete":true,"projectManageIssues":true,"projectManageSprints":true,"projectViewDashboard":true,"projectExport":true,"projectManagePhases":true,"projectResourcePlanning":true,"hrViewList":true,"hrViewDepartments":true,"hrViewPositions":true,"hrViewDashboard":true}'
    FROM company_members cm JOIN users u ON cm.user_id = u.user_id
    WHERE u.username = 'pm_a' AND cm.company_id = 1;

    -- Migrate any old MANAGER_* roles to EMPLOYEE
    UPDATE company_member_roles SET [role] = 'EMPLOYEE'
    WHERE [role] IN ('MANAGER_HR', 'MANAGER_ACCOUNTING', 'MANAGER_PROJECT');
    IF @@ROWCOUNT > 0 PRINT N'✅ Migrated MANAGER_* roles → EMPLOYEE';

    PRINT N'✅ Updated custom permissions for hr_a and pm_a';
END
GO

-- =====================================================
-- 0. PASSWORD HASH cho "Admin@123" (BCrypt cost=10)
-- =====================================================
DECLARE @pw VARCHAR(100) = '$2a$10$AlsxFCJZEN21Uf4a5VIpgey09u7LsnmVYvti93p0h89comm///RwO';

-- =====================================================
-- 1. USERS (30 users)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'sysadmin')
BEGIN
    -- System Admin
    INSERT INTO users (username, password_hash, email, is_active, is_deleted, is_online, is_system_admin, [status], avatar_data, created_at, updated_at) VALUES
        ('sysadmin', @pw, 'sysadmin@system.com', 1, 0, 0, 1, 'ACTIVE', 'https://ui-avatars.com/api/?name=SYS&background=7c3aed&color=fff&size=128', GETDATE(), GETDATE());

    -- Company A (ENTERPRISE) - 10 users
    INSERT INTO users (username, password_hash, email, is_active, is_deleted, is_online, is_system_admin, [status], avatar_data, created_at, updated_at) VALUES
        ('owner_a',     @pw, 'owner@companya.com',     1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=OA&background=0ea5e9&color=fff&size=128', GETDATE(), GETDATE()),
        ('admin_a',     @pw, 'admin@companya.com',     1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=AA&background=f43f5e&color=fff&size=128', GETDATE(), GETDATE()),
        ('hr_a',        @pw, 'hr@companya.com',        1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=HR&background=8b5cf6&color=fff&size=128', GETDATE(), GETDATE()),
        ('acc_a',       @pw, 'acc@companya.com',       1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=AC&background=f97316&color=fff&size=128', GETDATE(), GETDATE()),
        ('pm_a',        @pw, 'pm@companya.com',        1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=PM&background=14b8a6&color=fff&size=128', GETDATE(), GETDATE()),
        ('dev_a1',      @pw, 'dev1@companya.com',      1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=D1&background=random&color=fff&size=128', GETDATE(), GETDATE()),
        ('dev_a2',      @pw, 'dev2@companya.com',      1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=D2&background=random&color=fff&size=128', GETDATE(), GETDATE()),
        ('dev_a3',      @pw, 'dev3@companya.com',      1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=D3&background=random&color=fff&size=128', GETDATE(), GETDATE()),
        ('emp_a1',      @pw, 'emp1@companya.com',      1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=E1&background=random&color=fff&size=128', GETDATE(), GETDATE()),
        ('emp_a2',      @pw, 'emp2@companya.com',      1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=E2&background=random&color=fff&size=128', GETDATE(), GETDATE());

    -- Company B (PROFESSIONAL) - 6 users
    INSERT INTO users (username, password_hash, email, is_active, is_deleted, is_online, is_system_admin, [status], avatar_data, created_at, updated_at) VALUES
        ('owner_b',     @pw, 'owner@companyb.com',     1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=OB&background=22c55e&color=fff&size=128', GETDATE(), GETDATE()),
        ('admin_b',     @pw, 'admin@companyb.com',     1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=AB&background=ef4444&color=fff&size=128', GETDATE(), GETDATE()),
        ('hr_b',        @pw, 'hr@companyb.com',        1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=HB&background=a855f7&color=fff&size=128', GETDATE(), GETDATE()),
        ('pm_b',        @pw, 'pm@companyb.com',        1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=PB&background=06b6d4&color=fff&size=128', GETDATE(), GETDATE()),
        ('dev_b1',      @pw, 'dev1@companyb.com',      1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=DB&background=random&color=fff&size=128', GETDATE(), GETDATE()),
        ('emp_b1',      @pw, 'emp1@companyb.com',      1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=EB&background=random&color=fff&size=128', GETDATE(), GETDATE());

    -- Company C (STARTER) - 4 users
    INSERT INTO users (username, password_hash, email, is_active, is_deleted, is_online, is_system_admin, [status], avatar_data, created_at, updated_at) VALUES
        ('owner_c',     @pw, 'owner@companyc.com',     1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=OC&background=eab308&color=fff&size=128', GETDATE(), GETDATE()),
        ('admin_c',     @pw, 'admin@companyc.com',     1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=AC&background=d946ef&color=fff&size=128', GETDATE(), GETDATE()),
        ('pm_c',        @pw, 'pm@companyc.com',        1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=PC&background=random&color=fff&size=128', GETDATE(), GETDATE()),
        ('emp_c1',      @pw, 'emp1@companyc.com',      1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=EC&background=random&color=fff&size=128', GETDATE(), GETDATE());

    -- Company D (FREE) - 3 users
    INSERT INTO users (username, password_hash, email, is_active, is_deleted, is_online, is_system_admin, [status], avatar_data, created_at, updated_at) VALUES
        ('owner_d',     @pw, 'owner@companyd.com',     1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=OD&background=64748b&color=fff&size=128', GETDATE(), GETDATE()),
        ('pm_d',        @pw, 'pm@companyd.com',        1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=PD&background=random&color=fff&size=128', GETDATE(), GETDATE()),
        ('emp_d1',      @pw, 'emp1@companyd.com',      1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=ED&background=random&color=fff&size=128', GETDATE(), GETDATE());

    -- Multi-company user (thuộc cả Company A + B)
    INSERT INTO users (username, password_hash, email, is_active, is_deleted, is_online, is_system_admin, [status], avatar_data, created_at, updated_at) VALUES
        ('multi_user',  @pw, 'multi@example.com',      1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=MU&background=ec4899&color=fff&size=128', GETDATE(), GETDATE());

    PRINT N'✅ Created 25 users + 1 sysadmin';
END
GO

-- =====================================================
-- 2. COMPANIES (4 gói khác nhau)
-- =====================================================
DECLARE @pw2 VARCHAR(100) = '$2a$10$AlsxFCJZEN21Uf4a5VIpgey09u7LsnmVYvti93p0h89comm///RwO';

IF NOT EXISTS (SELECT 1 FROM companies WHERE slug = 'tech-corp')
BEGIN
    SET IDENTITY_INSERT companies ON;
    INSERT INTO companies (company_id, name, description, slug, subscription_plan, is_active, email, phone, address, created_at, updated_at) VALUES
        (1, N'Tech Corp',         N'Công ty công nghệ hàng đầu',       'tech-corp',     'ENTERPRISE',   1, 'info@techcorp.vn',    '0901234567', N'123 Nguyễn Huệ, Q1, HCM',     GETDATE(), GETDATE()),
        (2, N'Startup Hub',       N'Công ty khởi nghiệp sáng tạo',     'startup-hub',   'PROFESSIONAL', 1, 'info@startuphub.vn',  '0902345678', N'456 Lý Tự Trọng, Q3, HCM',    GETDATE(), GETDATE()),
        (3, N'Small Biz',         N'Doanh nghiệp nhỏ',                 'small-biz',     'STARTER',      1, 'info@smallbiz.vn',    '0903456789', N'789 Trần Hưng Đạo, Q5, HCM',  GETDATE(), GETDATE()),
        (4, N'Free Trial Co',     N'Công ty dùng thử',                  'free-trial',    'FREE',         1, 'info@freetrial.vn',   '0904567890', N'321 Hai Bà Trưng, Q1, HCM',   GETDATE(), GETDATE());
    SET IDENTITY_INSERT companies OFF;
    PRINT N'✅ Created 4 companies: ENTERPRISE, PROFESSIONAL, STARTER, FREE';
END
GO

-- =====================================================
-- 3. COMPANY MEMBERS + ROLES
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM company_members WHERE company_id = 1)
BEGIN
    -- Company A (ENTERPRISE) - 10 members + 1 multi_user
    DECLARE @uid BIGINT;

    -- owner_a → OWNER
    SELECT @uid = user_id FROM users WHERE username = 'owner_a';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 1, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'OWNER' FROM company_members WHERE user_id = @uid AND company_id = 1;

    -- admin_a → ADMIN
    SELECT @uid = user_id FROM users WHERE username = 'admin_a';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 1, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'COMPANY_ADMIN' FROM company_members WHERE user_id = @uid AND company_id = 1;

    -- hr_a → EMPLOYEE + custom HR & Project permissions
    SELECT @uid = user_id FROM users WHERE username = 'hr_a';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 1, 1, GETDATE(), '{"hrViewList":true,"hrEditProfile":true,"hrCreateEmployee":true,"hrDeleteEmployee":true,"hrManageContracts":true,"hrManageReviews":true,"hrViewDepartments":true,"hrManageDepartments":true,"hrViewPositions":true,"hrManagePositions":true,"hrViewDashboard":true,"hrExport":true,"projectCreate":true,"projectManageIssues":true,"projectViewDashboard":true}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'EMPLOYEE' FROM company_members WHERE user_id = @uid AND company_id = 1;

    -- acc_a → EMPLOYEE (default permissions)
    SELECT @uid = user_id FROM users WHERE username = 'acc_a';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 1, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'EMPLOYEE' FROM company_members WHERE user_id = @uid AND company_id = 1;

    -- pm_a → EMPLOYEE + custom Project & HR view permissions
    SELECT @uid = user_id FROM users WHERE username = 'pm_a';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 1, 1, GETDATE(), '{"projectCreate":true,"projectManageAll":true,"projectDelete":true,"projectManageIssues":true,"projectManageSprints":true,"projectViewDashboard":true,"projectExport":true,"projectManagePhases":true,"projectResourcePlanning":true,"hrViewList":true,"hrViewDepartments":true,"hrViewPositions":true,"hrViewDashboard":true}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'EMPLOYEE' FROM company_members WHERE user_id = @uid AND company_id = 1;

    -- dev_a1, dev_a2, dev_a3, emp_a1, emp_a2 → EMPLOYEE
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at)
    SELECT user_id, 1, 1, GETDATE(), '{}', GETDATE(), GETDATE() FROM users WHERE username IN ('dev_a1','dev_a2','dev_a3','emp_a1','emp_a2');
    INSERT INTO company_member_roles (member_id, [role])
    SELECT m.id, 'EMPLOYEE' FROM company_members m JOIN users u ON m.user_id = u.user_id WHERE u.username IN ('dev_a1','dev_a2','dev_a3','emp_a1','emp_a2') AND m.company_id = 1;

    -- multi_user → EMPLOYEE in Company A
    SELECT @uid = user_id FROM users WHERE username = 'multi_user';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 1, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'EMPLOYEE' FROM company_members WHERE user_id = @uid AND company_id = 1;

    -- Company B (PROFESSIONAL) - 6 members + multi_user
    SELECT @uid = user_id FROM users WHERE username = 'owner_b';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 2, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'OWNER' FROM company_members WHERE user_id = @uid AND company_id = 2;

    SELECT @uid = user_id FROM users WHERE username = 'admin_b';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 2, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'COMPANY_ADMIN' FROM company_members WHERE user_id = @uid AND company_id = 2;

    SELECT @uid = user_id FROM users WHERE username = 'hr_b';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 2, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'EMPLOYEE' FROM company_members WHERE user_id = @uid AND company_id = 2;

    SELECT @uid = user_id FROM users WHERE username = 'pm_b';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 2, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'EMPLOYEE' FROM company_members WHERE user_id = @uid AND company_id = 2;

    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at)
    SELECT user_id, 2, 1, GETDATE(), '{}', GETDATE(), GETDATE() FROM users WHERE username IN ('dev_b1','emp_b1');
    INSERT INTO company_member_roles (member_id, [role])
    SELECT m.id, 'EMPLOYEE' FROM company_members m JOIN users u ON m.user_id = u.user_id WHERE u.username IN ('dev_b1','emp_b1') AND m.company_id = 2;

    -- multi_user → EMPLOYEE in Company B
    SELECT @uid = user_id FROM users WHERE username = 'multi_user';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 2, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'EMPLOYEE' FROM company_members WHERE user_id = @uid AND company_id = 2;

    -- Company C (STARTER) - 4 members
    SELECT @uid = user_id FROM users WHERE username = 'owner_c';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 3, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'OWNER' FROM company_members WHERE user_id = @uid AND company_id = 3;

    SELECT @uid = user_id FROM users WHERE username = 'admin_c';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 3, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'COMPANY_ADMIN' FROM company_members WHERE user_id = @uid AND company_id = 3;

    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at)
    SELECT user_id, 3, 1, GETDATE(), '{}', GETDATE(), GETDATE() FROM users WHERE username IN ('pm_c','emp_c1');
    INSERT INTO company_member_roles (member_id, [role])
    SELECT m.id, 'EMPLOYEE' FROM company_members m JOIN users u ON m.user_id = u.user_id WHERE u.username IN ('pm_c','emp_c1') AND m.company_id = 3;

    -- Company D (FREE) - 3 members
    SELECT @uid = user_id FROM users WHERE username = 'owner_d';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 4, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'OWNER' FROM company_members WHERE user_id = @uid AND company_id = 4;

    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at)
    SELECT user_id, 4, 1, GETDATE(), '{}', GETDATE(), GETDATE() FROM users WHERE username IN ('pm_d','emp_d1');
    INSERT INTO company_member_roles (member_id, [role])
    SELECT m.id, 'EMPLOYEE' FROM company_members m JOIN users u ON m.user_id = u.user_id WHERE u.username IN ('pm_d','emp_d1') AND m.company_id = 4;

    PRINT N'✅ Created all company members and roles';
END
GO

-- =====================================================
-- 4. COMPANY SETTINGS (theo plan limits)
-- =====================================================
-- ENTERPRISE (Company 1) - all enabled, unlimited
IF NOT EXISTS (SELECT 1 FROM company_settings WHERE company_id = 1)
    INSERT INTO company_settings (company_id, hr_module_enabled, project_module_enabled, chat_module_enabled, storage_module_enabled, ai_module_enabled, webhook_enabled, attendance_enabled, leave_enabled, salary_enabled, contract_enabled, review_enabled, okr_enabled, skills_matrix_enabled, onboarding_enabled, resource_planning_enabled, org_chart_enabled, time_tracking_enabled, analytics_enabled, calendar_enabled, chat_reactions_enabled, chat_file_share_enabled, chat_threads_enabled, chat_search_enabled, max_employees, max_projects, max_storage_bytes, max_file_upload_bytes, allowed_radius, user_storage_quota_bytes, max_leave_days_per_year, created_at, updated_at)
    VALUES (1, 1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, 9999,9999,-1,524288000, 100.0, 10737418240, 15, GETDATE(), GETDATE());

-- PROFESSIONAL (Company 2) - HR enabled, AI enabled
IF NOT EXISTS (SELECT 1 FROM company_settings WHERE company_id = 2)
    INSERT INTO company_settings (company_id, hr_module_enabled, project_module_enabled, chat_module_enabled, storage_module_enabled, ai_module_enabled, webhook_enabled, attendance_enabled, leave_enabled, salary_enabled, contract_enabled, review_enabled, okr_enabled, skills_matrix_enabled, onboarding_enabled, resource_planning_enabled, org_chart_enabled, time_tracking_enabled, analytics_enabled, calendar_enabled, chat_reactions_enabled, chat_file_share_enabled, chat_threads_enabled, chat_search_enabled, max_employees, max_projects, max_storage_bytes, max_file_upload_bytes, allowed_radius, max_leave_days_per_year, created_at, updated_at)
    VALUES (2, 1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, 100,100,107374182400,104857600, 100.0, 12, GETDATE(), GETDATE());

-- STARTER (Company 3) - no HR, no AI, no webhook
IF NOT EXISTS (SELECT 1 FROM company_settings WHERE company_id = 3)
    INSERT INTO company_settings (company_id, hr_module_enabled, project_module_enabled, chat_module_enabled, storage_module_enabled, ai_module_enabled, webhook_enabled, attendance_enabled, leave_enabled, salary_enabled, contract_enabled, review_enabled, okr_enabled, skills_matrix_enabled, onboarding_enabled, resource_planning_enabled, org_chart_enabled, time_tracking_enabled, analytics_enabled, calendar_enabled, chat_reactions_enabled, chat_file_share_enabled, chat_threads_enabled, chat_search_enabled, max_employees, max_projects, max_storage_bytes, max_file_upload_bytes, allowed_radius, max_leave_days_per_year, created_at, updated_at)
    VALUES (3, 0,1,1,1,1,0, 0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0, 20,20,10737418240,52428800, 100.0, 12, GETDATE(), GETDATE());

-- FREE (Company 4) - basic only
IF NOT EXISTS (SELECT 1 FROM company_settings WHERE company_id = 4)
    INSERT INTO company_settings (company_id, hr_module_enabled, project_module_enabled, chat_module_enabled, storage_module_enabled, ai_module_enabled, webhook_enabled, attendance_enabled, leave_enabled, salary_enabled, contract_enabled, review_enabled, okr_enabled, skills_matrix_enabled, onboarding_enabled, resource_planning_enabled, org_chart_enabled, time_tracking_enabled, analytics_enabled, calendar_enabled, chat_reactions_enabled, chat_file_share_enabled, chat_threads_enabled, chat_search_enabled, max_employees, max_projects, max_storage_bytes, max_file_upload_bytes, allowed_radius, max_leave_days_per_year, created_at, updated_at)
    VALUES (4, 0,1,1,1,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0, 5,3,1073741824,10485760, 100.0, 12, GETDATE(), GETDATE());

PRINT N'✅ Created company settings for 4 plans';
GO

-- =====================================================
-- 5. ISSUE STATUSES (Global - Kanban columns)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM issue_statuses WHERE name = 'To Do')
    INSERT INTO issue_statuses (name, order_index, color) VALUES ('To Do', 1, '#E2E8F0');
IF NOT EXISTS (SELECT 1 FROM issue_statuses WHERE name = 'In Progress')
    INSERT INTO issue_statuses (name, order_index, color) VALUES ('In Progress', 2, '#4BADE8');
IF NOT EXISTS (SELECT 1 FROM issue_statuses WHERE name = 'Review')
    INSERT INTO issue_statuses (name, order_index, color) VALUES ('Review', 3, '#F6AD55');
IF NOT EXISTS (SELECT 1 FROM issue_statuses WHERE name = 'Done')
    INSERT INTO issue_statuses (name, order_index, color) VALUES ('Done', 4, '#48BB78');
PRINT N'✅ Created issue statuses';
GO

-- =====================================================
-- DONE
-- =====================================================
PRINT N'';
PRINT N'=====================================================';
PRINT N'✅ SETUP COMPLETE!';
PRINT N'=====================================================';
PRINT N'';
PRINT N'📊 Companies:';
PRINT N'  | Company       | Plan         | Members |';
PRINT N'  |---------------|--------------|---------|';
PRINT N'  | Tech Corp     | ENTERPRISE   | 11      |';
PRINT N'  | Startup Hub   | PROFESSIONAL | 7       |';
PRINT N'  | Small Biz     | STARTER      | 4       |';
PRINT N'  | Free Trial Co | FREE         | 3       |';
PRINT N'';
PRINT N'📌 Tài khoản test (Password: Admin@123):';
PRINT N'  sysadmin    → System Admin';
PRINT N'  owner_a     → OWNER @ Tech Corp';
PRINT N'  hr_a        → EMPLOYEE + HR permissions @ Tech Corp';
PRINT N'  pm_a        → EMPLOYEE + PM permissions @ Tech Corp';
PRINT N'  multi_user  → EMPLOYEE @ Tech Corp + EMPLOYEE @ Startup Hub';
PRINT N'';
PRINT N'▶️ Tiếp theo: Chạy 02_seed_data.sql';
GO

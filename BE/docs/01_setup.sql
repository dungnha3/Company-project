-- =====================================================
-- GEMINI ERP - SETUP SCRIPT
-- File: 01_setup.sql
-- T?o users, companies (4 g�i kh�c nhau), settings
-- Ch?y SAU KHI app ??� t?o tables (start app 1 l?n r??i t?t)
-- =====================================================

USE DACN;
GO

-- FIX: S?a role 'ADMIN' ??? 'COMPANY_ADMIN' n?u data c? c�n d�ng sai t�n
-- (Java enum l� COMPANY_ADMIN, kh�ng ph?i ADMIN)
-- Ph?i drop CHECK constraint tr???c v� constraint c? ch?? cho ph�p 'ADMIN'
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'company_member_roles')
BEGIN
    -- Drop CHECK constraint tr�n c??t role (t�n constraint c� th?? kh�c nhau m??i DB)
    DECLARE @constraintName NVARCHAR(200);
    SELECT @constraintName = cc.CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE cc
    JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS ck ON cc.CONSTRAINT_NAME = ck.CONSTRAINT_NAME
    WHERE cc.TABLE_NAME = 'company_member_roles' AND cc.COLUMN_NAME = 'role';

    IF @constraintName IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE company_member_roles DROP CONSTRAINT ' + @constraintName);
        PRINT N'???? Dropped old CHECK constraint: ' + @constraintName;
    END

    -- Update role values
    UPDATE company_member_roles SET [role] = 'COMPANY_ADMIN' WHERE [role] = 'ADMIN';
    IF @@ROWCOUNT > 0 PRINT N'??? Fixed ADMIN ??? COMPANY_ADMIN in company_member_roles';

    -- T?o l?i CHECK constraint v??i ??�ng enum values
    ALTER TABLE company_member_roles ADD CONSTRAINT CK_company_member_roles_role
        CHECK ([role] IN ('OWNER','COMPANY_ADMIN','EMPLOYEE'));
    PRINT N'??? Recreated CHECK constraint with correct enum values';
END
GO

-- FIX: C?p nh?t permissions cho hr_a (HR + Project) v� pm_a (PM + HR view)
-- Roles gi? ch?? c� OWNER, COMPANY_ADMIN, EMPLOYEE. Permissions t�y ch??nh qua JSON.
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'company_members')
BEGIN
    -- hr_a: EMPLOYEE + custom HR & Project permissions
    UPDATE cm SET cm.permissions = '{"hrViewList":true,"hrEditProfile":true,"hrCreateEmployee":true,"hrDeleteEmployee":true,"hrManageContracts":true,"hrManageReviews":true,"hrViewDepartments":true,"hrManageDepartments":true,"hrViewPositions":true,"hrManagePositions":true,"hrViewDashboard":true,"hrExport":true,"projectCreate":true,"projectManageIssues":true,"projectViewDashboard":true,"reviewViewAll":true,"reviewCreate":true,"reviewApprove":true}'
    FROM company_members cm JOIN users u ON cm.user_id = u.user_id
    WHERE u.username = 'hr_a' AND cm.company_id = 1;

    -- pm_a: EMPLOYEE + custom Project & HR view permissions
    UPDATE cm SET cm.permissions = '{"projectCreate":true,"projectManageAll":true,"projectDelete":true,"projectManageIssues":true,"projectManageSprints":true,"projectViewDashboard":true,"projectExport":true,"projectManagePhases":true,"projectResourcePlanning":true,"hrViewList":true,"hrViewDepartments":true,"hrViewPositions":true,"hrViewDashboard":true}'
    FROM company_members cm JOIN users u ON cm.user_id = u.user_id
    WHERE u.username = 'pm_a' AND cm.company_id = 1;

    -- Migrate any old MANAGER_* roles to EMPLOYEE
    UPDATE company_member_roles SET [role] = 'EMPLOYEE'
    WHERE [role] IN ('MANAGER_HR', 'MANAGER_ACCOUNTING', 'MANAGER_PROJECT');
    IF @@ROWCOUNT > 0 PRINT N'??? Migrated MANAGER_* roles ??? EMPLOYEE';

    PRINT N'??? Updated custom permissions for hr_a and pm_a';
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
        ('emp_a2',      @pw, 'emp2@companya.com',      1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=E2&background=random&color=fff&size=128', GETDATE(), GETDATE()),
        ('full_emp',    @pw, 'fullemp@companya.com',   1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=FE&background=ec4899&color=fff&size=128', GETDATE(), GETDATE());

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

    -- Multi-company user (thu??c c? Company A + B)
    INSERT INTO users (username, password_hash, email, is_active, is_deleted, is_online, is_system_admin, [status], avatar_data, created_at, updated_at) VALUES
        ('multi_user',  @pw, 'multi@example.com',      1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=MU&background=ec4899&color=fff&size=128', GETDATE(), GETDATE());

    PRINT N'??? Created 25 users + 1 sysadmin';
END
GO

-- =====================================================
-- 2. COMPANIES (4 gi khc nhau)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM companies WHERE slug = 'tech-corp')
BEGIN
    SET IDENTITY_INSERT companies ON;
    INSERT INTO companies (company_id, name, description, slug, is_active, email, phone, address, subscription_plan, created_at, updated_at) VALUES
        (1, N'Tech Corp',         N'Cng ty cng ngh?? hng ???u',       'tech-corp',     1, 'info@techcorp.vn',    '0901234567', N'123 Nguy??n Hu??, Q1, HCM',     'ENTERPRISE', GETDATE(), GETDATE()),
        (2, N'Startup Hub',       N'Cng ty kh??i nghi??p sng t?o',     'startup-hub',   1, 'info@startuphub.vn',  '0902345678', N'456 L T? Tr?ng, Q3, HCM',    'PROFESSIONAL', GETDATE(), GETDATE()),
        (3, N'Small Biz',         N'Doanh nghi??p nh?',                 'small-biz',     1, 'info@smallbiz.vn',    '0903456789', N'789 Tr?n H?ng ??o, Q5, HCM',  'STARTER', GETDATE(), GETDATE()),
        (4, N'Free Trial Co',     N'Cng ty dng th?',                  'free-trial',    1, 'info@freetrial.vn',   '0904567890', N'321 Hai B Tr?ng, Q1, HCM',   'FREE', GETDATE(), GETDATE());
    SET IDENTITY_INSERT companies OFF;
    PRINT N'??? Created 4 companies: ENTERPRISE, PROFESSIONAL, STARTER, FREE';
END
GO

-- -- 3. COMPANY MEMBERS + ROLES
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM company_members WHERE company_id = 1)
BEGIN
    -- Company A (ENTERPRISE) - 10 members + 1 multi_user
    DECLARE @uid BIGINT;

    -- owner_a ??? OWNER
    SELECT @uid = user_id FROM users WHERE username = 'owner_a';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 1, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'OWNER' FROM company_members WHERE user_id = @uid AND company_id = 1;

    -- admin_a ??? ADMIN
    SELECT @uid = user_id FROM users WHERE username = 'admin_a';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 1, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'COMPANY_ADMIN' FROM company_members WHERE user_id = @uid AND company_id = 1;

    -- hr_a ??? EMPLOYEE + custom HR & Project permissions
    SELECT @uid = user_id FROM users WHERE username = 'hr_a';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 1, 1, GETDATE(), '{"hrViewList":true,"hrEditProfile":true,"hrCreateEmployee":true,"hrDeleteEmployee":true,"hrManageContracts":true,"hrManageReviews":true,"hrViewDepartments":true,"hrManageDepartments":true,"hrViewPositions":true,"hrManagePositions":true,"hrViewDashboard":true,"hrExport":true,"projectCreate":true,"projectManageIssues":true,"projectViewDashboard":true,"reviewViewAll":true,"reviewCreate":true,"reviewApprove":true}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'EMPLOYEE' FROM company_members WHERE user_id = @uid AND company_id = 1;

    -- acc_a ??? EMPLOYEE (default permissions)
    SELECT @uid = user_id FROM users WHERE username = 'acc_a';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 1, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'EMPLOYEE' FROM company_members WHERE user_id = @uid AND company_id = 1;

    -- pm_a ??? EMPLOYEE + custom Project & HR view permissions
    SELECT @uid = user_id FROM users WHERE username = 'pm_a';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 1, 1, GETDATE(), '{"projectCreate":true,"projectManageAll":true,"projectDelete":true,"projectManageIssues":true,"projectManageSprints":true,"projectViewDashboard":true,"projectExport":true,"projectManagePhases":true,"projectResourcePlanning":true,"hrViewList":true,"hrViewDepartments":true,"hrViewPositions":true,"hrViewDashboard":true}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'EMPLOYEE' FROM company_members WHERE user_id = @uid AND company_id = 1;

    -- dev_a1, dev_a2, dev_a3, emp_a1, emp_a2 ??? EMPLOYEE
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at)
    SELECT user_id, 1, 1, GETDATE(), '{}', GETDATE(), GETDATE() FROM users WHERE username IN ('dev_a1','dev_a2','dev_a3','emp_a1','emp_a2');
    INSERT INTO company_member_roles (member_id, [role])
    SELECT m.id, 'EMPLOYEE' FROM company_members m JOIN users u ON m.user_id = u.user_id WHERE u.username IN ('dev_a1','dev_a2','dev_a3','emp_a1','emp_a2') AND m.company_id = 1;

    -- multi_user ??? EMPLOYEE in Company A
    SELECT @uid = user_id FROM users WHERE username = 'multi_user';
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at) VALUES (@uid, 1, 1, GETDATE(), '{}', GETDATE(), GETDATE());
    INSERT INTO company_member_roles (member_id, [role]) SELECT id, 'EMPLOYEE' FROM company_members WHERE user_id = @uid AND company_id = 1;

    -- Company B (PROFESSIONAL) - 6 members
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

    -- multi_user ??? EMPLOYEE in Company B
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

    PRINT N'??? Created all company members and roles';
END
GO

-- =====================================================
-- FIX: ??M B?O full_emp LU?N ???C T?O (CH?Y SAU KHI users ?? ?)
-- Tch ring ra KH?NG trong IF NOT EXISTS ??lu?n ch?y
-- =====================================================
DECLARE @pw_full VARCHAR(100) = '$2a$10$AlsxFCJZEN21Uf4a5VIpgey09u7LsnmVYvti93p0h89comm///RwO';
DECLARE @uid_full BIGINT;

-- T?o user full_emp n?u chua c?
IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'full_emp')
BEGIN
    INSERT INTO users (username, password_hash, email, is_active, is_deleted, is_online, is_system_admin, [status], avatar_data, created_at, updated_at)
    VALUES ('full_emp', @pw_full, 'fullemp@companya.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=FE&background=ec4899&color=fff&size=128', GETDATE(), GETDATE());
    PRINT N'??? Created full_emp user';
END
ELSE
BEGIN
    -- C?p nh?t password cho full_emp n?u ?? c?
    UPDATE users
    SET password_hash = @pw_full,
        email = 'fullemp@companya.com',
        is_active = 1,
        [status] = 'ACTIVE',
        updated_at = GETDATE()
    WHERE username = 'full_emp';
END

SELECT @uid_full = user_id FROM users WHERE username = 'full_emp';

-- Thm full_emp vo Tech Corp (company_id = 1) n?u chua c?
IF NOT EXISTS (SELECT 1 FROM company_members WHERE user_id = @uid_full AND company_id = 1)
BEGIN
    INSERT INTO company_members (user_id, company_id, is_active, joined_at, permissions, created_at, updated_at)
    VALUES (@uid_full, 1, 1, GETDATE(), '{"workspaceManageMembers":true,"workspaceManageRequests":true,"hrViewList":true,"hrEditProfile":true,"hrCreateEmployee":true,"hrDeleteEmployee":true,"hrManageReviews":true,"hrViewDashboard":true,"hrExport":true,"projectCreate":true,"projectDelete":true,"projectManageAll":true,"projectManageIssues":true,"projectManageSprints":true,"projectManagePhases":true,"projectResourcePlanning":true,"projectViewDashboard":true,"projectExport":true,"timetrackingLog":true,"timetrackingViewAll":true,"leaveApprove":true,"leaveViewAll":true,"analyticsView":true,"calendarView":true,"calendarManage":true,"reviewViewAll":true,"reviewCreate":true,"reviewApprove":true}', GETDATE(), GETDATE());

    INSERT INTO company_member_roles (member_id, [role])
    SELECT id, 'EMPLOYEE' FROM company_members WHERE user_id = @uid_full AND company_id = 1;

    PRINT N'??? Added full_emp to Tech Corp (company_id=1)';
END
ELSE
BEGIN
    PRINT N'full_emp da co trong Tech Corp roi';
END

-- T?o employee record cho full_emp n?u chua c?
IF NOT EXISTS (SELECT 1 FROM employees WHERE user_id = @uid_full)
BEGIN
    INSERT INTO employees (user_id, company_id, full_name, id_card, date_of_birth, gender, hire_date, [status], base_salary, allowance, created_at, updated_at)
    VALUES (@uid_full, 1, N'NV full_emp', '012345678999', DATEADD(year, -25, GETDATE()), 'MALE', DATEADD(month, -6, GETDATE()), 'ACTIVE', 25000000, 2000000, GETDATE(), GETDATE());
    PRINT N'??? Created employee record for full_emp';
END
GO

-- =====================================================
-- 4. COMPANY SETTINGS (current schema)
-- =====================================================
-- Feature toggle columns were removed from company_settings.
-- Dynamically drop any obsolete columns that are not present in the current Java entity model to prevent insertion failures.
DECLARE @colName NVARCHAR(100);
DECLARE col_cursor CURSOR FOR
    SELECT name 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('company_settings')
      AND name NOT IN ('company_id', 'google_drive_access_token', 'google_drive_refresh_token', 'drive_folder_id', 'created_at', 'updated_at');

OPEN col_cursor;
FETCH NEXT FROM col_cursor INTO @colName;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Drop default constraints associated with the column first, if any
    DECLARE @constName NVARCHAR(200);
    DECLARE const_cursor CURSOR FOR
        SELECT d.name 
        FROM sys.default_constraints d 
        JOIN sys.columns c ON d.parent_column_id = c.column_id AND d.parent_object_id = c.object_id
        WHERE d.parent_object_id = OBJECT_ID('company_settings') AND c.name = @colName;
        
    OPEN const_cursor;
    FETCH NEXT FROM const_cursor INTO @constName;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC('ALTER TABLE company_settings DROP CONSTRAINT [' + @constName + ']');
        FETCH NEXT FROM const_cursor INTO @constName;
    END
    CLOSE const_cursor;
    DEALLOCATE const_cursor;

    -- Drop the column
    EXEC('ALTER TABLE company_settings DROP COLUMN [' + @colName + ']');
    PRINT N'Dropped obsolete column ' + @colName + ' from company_settings';

    FETCH NEXT FROM col_cursor INTO @colName;
END

CLOSE col_cursor;
DEALLOCATE col_cursor;

-- Add missing columns for review settings (if not exist)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('company_settings') AND name = 'auto_review_enabled')
BEGIN
    ALTER TABLE company_settings ADD auto_review_enabled BIT DEFAULT 0;
    UPDATE company_settings SET auto_review_enabled = 0 WHERE auto_review_enabled IS NULL;
    ALTER TABLE company_settings ALTER COLUMN auto_review_enabled BIT NOT NULL;
    PRINT N'Added auto_review_enabled column';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('company_settings') AND name = 'review_cycle_type')
BEGIN
    ALTER TABLE company_settings ADD review_cycle_type NVARCHAR(20) DEFAULT N'QUARTERLY';
    UPDATE company_settings SET review_cycle_type = N'QUARTERLY' WHERE review_cycle_type IS NULL;
    PRINT N'Added review_cycle_type column';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('company_settings') AND name = 'last_review_auto_create')
BEGIN
    ALTER TABLE company_settings ADD last_review_auto_create NVARCHAR(50);
    PRINT N'Added last_review_auto_create column';
END

-- Keep one settings row per company for storage integrations/config.
IF NOT EXISTS (SELECT 1 FROM company_settings WHERE company_id = 1)
    INSERT INTO company_settings (company_id, auto_review_enabled, review_cycle_type, google_drive_access_token, google_drive_refresh_token, drive_folder_id, created_at, updated_at)
    VALUES (1, 0, N'QUARTERLY', NULL, NULL, NULL, GETDATE(), GETDATE());

IF NOT EXISTS (SELECT 1 FROM company_settings WHERE company_id = 2)
    INSERT INTO company_settings (company_id, auto_review_enabled, review_cycle_type, google_drive_access_token, google_drive_refresh_token, drive_folder_id, created_at, updated_at)
    VALUES (2, 0, N'QUARTERLY', NULL, NULL, NULL, GETDATE(), GETDATE());

IF NOT EXISTS (SELECT 1 FROM company_settings WHERE company_id = 3)
    INSERT INTO company_settings (company_id, auto_review_enabled, review_cycle_type, google_drive_access_token, google_drive_refresh_token, drive_folder_id, created_at, updated_at)
    VALUES (3, 0, N'QUARTERLY', NULL, NULL, NULL, GETDATE(), GETDATE());

IF NOT EXISTS (SELECT 1 FROM company_settings WHERE company_id = 4)
    INSERT INTO company_settings (company_id, auto_review_enabled, review_cycle_type, google_drive_access_token, google_drive_refresh_token, drive_folder_id, created_at, updated_at)
    VALUES (4, 0, N'QUARTERLY', NULL, NULL, NULL, GETDATE(), GETDATE());

PRINT N'??? Created company settings for 4 companies';
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
PRINT N'??? Created issue statuses';
GO

-- =====================================================
-- DONE
-- =====================================================
PRINT N'';
PRINT N'=====================================================';
PRINT N'??? SETUP COMPLETE!';
PRINT N'=====================================================';
PRINT N'';
PRINT N'???? Companies:';
PRINT N'  | Company       | Plan         | Members |';
PRINT N'  |---------------|--------------|---------|';
PRINT N'  | Tech Corp     | ENTERPRISE   | 11      |';
PRINT N'  | Startup Hub   | PROFESSIONAL | 7       |';
PRINT N'  | Small Biz     | STARTER      | 4       |';
PRINT N'  | Free Trial Co | FREE         | 3       |';
PRINT N'';
PRINT N'???? T�i kho?n test (Password: Admin@123):';
PRINT N'  sysadmin    ??? System Admin';
PRINT N'  owner_a     ??? OWNER @ Tech Corp';
PRINT N'  hr_a        ??? EMPLOYEE + HR permissions @ Tech Corp';
PRINT N'  pm_a        ??? EMPLOYEE + PM permissions @ Tech Corp';
PRINT N'  full_emp    ??? EMPLOYEE + ALL permissions @ Tech Corp';
PRINT N'  multi_user  ??? EMPLOYEE @ Tech Corp + EMPLOYEE @ Startup Hub';
PRINT N'';
-- =====================================================
-- FIX LEGACY STORAGE SCHEMA (Ensure files table columns)
-- =====================================================
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('files') AND name = 'file_path')
BEGIN
    ALTER TABLE files ALTER COLUMN file_path NVARCHAR(MAX) NULL;
    PRINT N'Altered file_path column to allow NULLs in files table';
END
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('files') AND name = 'filename')
BEGIN
    ALTER TABLE files ALTER COLUMN filename NVARCHAR(MAX) NULL;
    PRINT N'Altered filename column to allow NULLs in files table';
END
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('files') AND name = 'original_filename')
BEGIN
    ALTER TABLE files ALTER COLUMN original_filename NVARCHAR(MAX) NULL;
    PRINT N'Altered original_filename column to allow NULLs in files table';
END
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('files') AND name = 'owner_id')
BEGIN
    ALTER TABLE files ALTER COLUMN owner_id BIGINT NULL;
    PRINT N'Altered owner_id column to allow NULLs in files table';
END
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('files') AND name = 'is_deleted')
BEGIN
    ALTER TABLE files ALTER COLUMN is_deleted BIT NULL;
    PRINT N'Altered is_deleted column to allow NULLs in files table';
END
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('files') AND name = 'is_public')
BEGIN
    ALTER TABLE files ALTER COLUMN is_public BIT NULL;
    PRINT N'Altered is_public column to allow NULLs in files table';
END
GO

PRINT N'???? Ti?p theo: Ch?y 02_seed_data.sql';
GO


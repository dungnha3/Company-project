-- =====================================================
-- GEMINI ERP - COMPLETE SETUP SCRIPT
-- File: 01_setup.sql
-- Mục đích: Tạo users, company, settings - thay thế DefaultUsersInitializer.java
-- Chạy SAU KHI application đã tạo tables tự động (start app 1 lần rồi tắt)
-- =====================================================

-- =====================================================
-- 0. PASSWORD HASH cho "Admin@123" (BCrypt)
-- =====================================================
DECLARE @password_hash VARCHAR(100) = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqbKHVHF0hQzQE3OGQbR6hKwkE2Iq';

-- =====================================================
-- 1. COMPANY (Công ty mặc định)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM companies WHERE company_id = 1)
BEGIN
    SET IDENTITY_INSERT companies ON;
    INSERT INTO companies (company_id, name, slug, subscription_plan, is_active, created_at)
    VALUES (1, N'QLNV Demo Company', 'qlnv-demo', 'ENTERPRISE', 1, GETDATE());
    SET IDENTITY_INSERT companies OFF;
    PRINT N'✅ Created company: QLNV Demo Company';
END
ELSE
BEGIN
    UPDATE companies SET subscription_plan = 'ENTERPRISE', is_active = 1 WHERE company_id = 1;
    PRINT N'✅ Updated company to ENTERPRISE plan';
END

-- =====================================================
-- 2. USERS (26 users) - with is_deleted = 0
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'sysadmin')
BEGIN
    -- System Admin (không thuộc company)
    INSERT INTO users (username, password_hash, email, is_active, is_deleted, is_online, is_system_admin, [status], avatar_data, created_at) VALUES
        ('sysadmin', @password_hash, 'sysadmin@system.com', 1, 0, 0, 1, 'ACTIVE', 'https://ui-avatars.com/api/?name=System+Admin&background=7c3aed&color=fff&size=128', GETDATE());
    
    -- Core users
    INSERT INTO users (username, password_hash, email, is_active, is_deleted, is_online, is_system_admin, [status], avatar_data, created_at) VALUES
        ('admin', @password_hash, 'admin@example.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=admin&background=random&color=fff&size=128', GETDATE()),
        ('hr', @password_hash, 'hr@example.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=hr&background=random&color=fff&size=128', GETDATE()),
        ('accounting', @password_hash, 'accounting@example.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=accounting&background=random&color=fff&size=128', GETDATE()),
        ('pm', @password_hash, 'pm@example.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=pm&background=random&color=fff&size=128', GETDATE()),
        ('employee', @password_hash, 'employee@example.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=employee&background=random&color=fff&size=128', GETDATE());

    -- 5 Admin accounts
    INSERT INTO users (username, password_hash, email, is_active, is_deleted, is_online, is_system_admin, [status], avatar_data, created_at) VALUES
        ('admin1', @password_hash, 'admin1@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=admin1&background=random&color=fff&size=128', GETDATE()),
        ('admin2', @password_hash, 'admin2@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=admin2&background=random&color=fff&size=128', GETDATE()),
        ('admin3', @password_hash, 'admin3@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=admin3&background=random&color=fff&size=128', GETDATE()),
        ('admin4', @password_hash, 'admin4@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=admin4&background=random&color=fff&size=128', GETDATE()),
        ('admin5', @password_hash, 'admin5@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=admin5&background=random&color=fff&size=128', GETDATE());

    -- 5 HR Manager accounts
    INSERT INTO users (username, password_hash, email, is_active, is_deleted, is_online, is_system_admin, [status], avatar_data, created_at) VALUES
        ('hr_nguyen_van_a', @password_hash, 'nguyen.van.a@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Nguyen+Van+A&background=random&color=fff&size=128', GETDATE()),
        ('hr_tran_thi_b', @password_hash, 'tran.thi.b@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Tran+Thi+B&background=random&color=fff&size=128', GETDATE()),
        ('hr_le_van_c', @password_hash, 'le.van.c@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Le+Van+C&background=random&color=fff&size=128', GETDATE()),
        ('hr_pham_thi_d', @password_hash, 'pham.thi.d@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Pham+Thi+D&background=random&color=fff&size=128', GETDATE()),
        ('hr_hoang_van_e', @password_hash, 'hoang.van.e@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Hoang+Van+E&background=random&color=fff&size=128', GETDATE());

    -- 5 Accounting Manager accounts
    INSERT INTO users (username, password_hash, email, is_active, is_deleted, is_online, is_system_admin, [status], avatar_data, created_at) VALUES
        ('acc_nguyen_thi_f', @password_hash, 'nguyen.thi.f@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Nguyen+Thi+F&background=random&color=fff&size=128', GETDATE()),
        ('acc_tran_van_g', @password_hash, 'tran.van.g@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Tran+Van+G&background=random&color=fff&size=128', GETDATE()),
        ('acc_le_thi_h', @password_hash, 'le.thi.h@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Le+Thi+H&background=random&color=fff&size=128', GETDATE()),
        ('acc_pham_van_i', @password_hash, 'pham.van.i@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Pham+Van+I&background=random&color=fff&size=128', GETDATE()),
        ('acc_hoang_thi_j', @password_hash, 'hoang.thi.j@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Hoang+Thi+J&background=random&color=fff&size=128', GETDATE());

    -- 5 Project Manager accounts
    INSERT INTO users (username, password_hash, email, is_active, is_deleted, is_online, is_system_admin, [status], avatar_data, created_at) VALUES
        ('pm_nguyen_van_k', @password_hash, 'nguyen.van.k@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Nguyen+Van+K&background=random&color=fff&size=128', GETDATE()),
        ('pm_tran_thi_l', @password_hash, 'tran.thi.l@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Tran+Thi+L&background=random&color=fff&size=128', GETDATE()),
        ('pm_le_van_m', @password_hash, 'le.van.m@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Le+Van+M&background=random&color=fff&size=128', GETDATE()),
        ('pm_pham_thi_n', @password_hash, 'pham.thi.n@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Pham+Thi+N&background=random&color=fff&size=128', GETDATE()),
        ('pm_hoang_van_o', @password_hash, 'hoang.van.o@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Hoang+Van+O&background=random&color=fff&size=128', GETDATE());

    -- 5 Employee accounts
    INSERT INTO users (username, password_hash, email, is_active, is_deleted, is_online, is_system_admin, [status], avatar_data, created_at) VALUES
        ('emp_nguyen_thi_p', @password_hash, 'nguyen.thi.p@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Nguyen+Thi+P&background=random&color=fff&size=128', GETDATE()),
        ('emp_tran_van_q', @password_hash, 'tran.van.q@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Tran+Van+Q&background=random&color=fff&size=128', GETDATE()),
        ('emp_le_thi_r', @password_hash, 'le.thi.r@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Le+Thi+R&background=random&color=fff&size=128', GETDATE()),
        ('emp_pham_van_s', @password_hash, 'pham.van.s@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Pham+Van+S&background=random&color=fff&size=128', GETDATE()),
        ('emp_hoang_thi_t', @password_hash, 'hoang.thi.t@dacn.com', 1, 0, 0, 0, 'ACTIVE', 'https://ui-avatars.com/api/?name=Hoang+Thi+T&background=random&color=fff&size=128', GETDATE());

    PRINT N'✅ Created 26 users';
END

-- =====================================================
-- 3. COMPANY MEMBERS (Link users to company with roles)
-- =====================================================
DECLARE @admin_id BIGINT, @hr_id BIGINT, @acc_id BIGINT, @pm_id BIGINT, @emp_id BIGINT;
SELECT @admin_id = user_id FROM users WHERE username = 'admin';
SELECT @hr_id = user_id FROM users WHERE username = 'hr';
SELECT @acc_id = user_id FROM users WHERE username = 'accounting';
SELECT @pm_id = user_id FROM users WHERE username = 'pm';
SELECT @emp_id = user_id FROM users WHERE username = 'employee';

IF NOT EXISTS (SELECT 1 FROM company_members WHERE company_id = 1)
BEGIN
    -- Core users
    INSERT INTO company_members (user_id, company_id, [role], is_active, joined_at) VALUES
        (@admin_id, 1, 'OWNER', 1, GETDATE()),
        (@hr_id, 1, 'MANAGER_HR', 1, GETDATE()),
        (@acc_id, 1, 'MANAGER_ACCOUNTING', 1, GETDATE()),
        (@pm_id, 1, 'MANAGER_PROJECT', 1, GETDATE()),
        (@emp_id, 1, 'EMPLOYEE', 1, GETDATE());

    -- 5 Admins (admin1-5, not 'admin')
    INSERT INTO company_members (user_id, company_id, [role], is_active, joined_at)
    SELECT user_id, 1, 'ADMIN', 1, GETDATE() FROM users WHERE username LIKE 'admin[1-5]';

    -- 5 HR Managers (hr_*, not 'hr')
    INSERT INTO company_members (user_id, company_id, [role], is_active, joined_at)
    SELECT user_id, 1, 'MANAGER_HR', 1, GETDATE() FROM users WHERE username LIKE 'hr[_]%';

    -- 5 Accounting Managers
    INSERT INTO company_members (user_id, company_id, [role], is_active, joined_at)
    SELECT user_id, 1, 'MANAGER_ACCOUNTING', 1, GETDATE() FROM users WHERE username LIKE 'acc[_]%';

    -- 5 Project Managers (pm_*, not 'pm')
    INSERT INTO company_members (user_id, company_id, [role], is_active, joined_at)
    SELECT user_id, 1, 'MANAGER_PROJECT', 1, GETDATE() FROM users WHERE username LIKE 'pm[_]%';

    -- 5 Employees (emp_*, not 'employee')
    INSERT INTO company_members (user_id, company_id, [role], is_active, joined_at)
    SELECT user_id, 1, 'EMPLOYEE', 1, GETDATE() FROM users WHERE username LIKE 'emp[_]%';

    PRINT N'✅ Created company memberships';
END

-- =====================================================
-- 4. COMPANY SETTINGS (Enable all modules) - with all NOT NULL columns
-- =====================================================
IF EXISTS (SELECT 1 FROM company_settings WHERE company_id = 1)
BEGIN
    UPDATE company_settings 
    SET hr_module_enabled = 1,
        project_module_enabled = 1,
        chat_module_enabled = 1,
        storage_module_enabled = 1,
        ai_module_enabled = 1,
        attendance_enabled = 1,
        leave_enabled = 1,
        salary_enabled = 1,
        contract_enabled = 1,
        review_enabled = 1,
        time_tracking_enabled = 1,
        analytics_enabled = 1,
        calendar_enabled = 1,
        automation_enabled = 1
    WHERE company_id = 1;
END
ELSE
BEGIN
    INSERT INTO company_settings (
        company_id, 
        hr_module_enabled, project_module_enabled, chat_module_enabled, storage_module_enabled, ai_module_enabled,
        attendance_enabled, leave_enabled, salary_enabled, contract_enabled, review_enabled,
        max_employees, max_projects, max_storage_bytes, allowed_radius,
        time_tracking_enabled, analytics_enabled, calendar_enabled, automation_enabled
    )
    VALUES (1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 9999, 9999, 10737418240, 100.0, 1, 1, 1, 1);
END
PRINT N'✅ Enabled all modules';

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

-- =====================================================
-- DONE - Setup complete!
-- =====================================================
PRINT N'';
PRINT N'=====================================================';
PRINT N'✅ GEMINI ERP SETUP COMPLETE!';
PRINT N'=====================================================';
PRINT N'';
PRINT N'📊 CREATED:';
SELECT 'Users' as [Table], COUNT(*) as [Count] FROM users UNION ALL
SELECT 'Company Members', COUNT(*) FROM company_members WHERE company_id = 1;
PRINT N'';
PRINT N'📌 TÀI KHOẢN TEST (Password: Admin@123):';
PRINT N'   | Username  | Role                |';
PRINT N'   |-----------|---------------------|';
PRINT N'   | sysadmin  | System Admin        |';
PRINT N'   | admin     | OWNER (full access) |';
PRINT N'   | hr        | MANAGER_HR          |';
PRINT N'   | accounting| MANAGER_ACCOUNTING  |';
PRINT N'   | pm        | MANAGER_PROJECT     |';
PRINT N'   | employee  | EMPLOYEE            |';
PRINT N'   + 20 more accounts...            |';
PRINT N'=====================================================';
PRINT N'';
PRINT N'▶️ Tiếp theo: Chạy file 02_seed_data.sql để tạo dữ liệu test';

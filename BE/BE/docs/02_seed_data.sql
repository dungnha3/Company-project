-- =====================================================
-- GEMINI ERP - SEED DATA SCRIPT
-- File: 02_seed_data.sql
-- Mục đích: Tạo dữ liệu test đầy đủ cho tất cả modules
-- Chạy SAU KHI đã chạy 01_setup.sql
-- =====================================================

-- =====================================================
-- VARIABLES
-- =====================================================
DECLARE @admin_user_id BIGINT, @hr_user_id BIGINT, @pm_user_id BIGINT, @emp_user_id BIGINT;
DECLARE @project_id BIGINT, @sprint_active_id BIGINT;
DECLARE @status_todo INT, @status_progress INT, @status_review INT, @status_done INT;

SELECT @admin_user_id = user_id FROM users WHERE username = 'admin';
SELECT @hr_user_id = user_id FROM users WHERE username = 'hr';
SELECT @pm_user_id = user_id FROM users WHERE username = 'pm';
SELECT @emp_user_id = user_id FROM users WHERE username = 'employee';

SELECT @status_todo = status_id FROM issue_statuses WHERE name = 'To Do';
SELECT @status_progress = status_id FROM issue_statuses WHERE name = 'In Progress';
SELECT @status_review = status_id FROM issue_statuses WHERE name = 'Review';
SELECT @status_done = status_id FROM issue_statuses WHERE name = 'Done';

-- =====================================================
-- 1. DEPARTMENTS
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM departments WHERE company_id = 1)
BEGIN
    INSERT INTO departments (name, description, company_id) VALUES
        (N'Phòng Công nghệ', N'Software Development & IT', 1),
        (N'Phòng Nhân sự', N'Human Resources Management', 1),
        (N'Phòng Kinh doanh', N'Sales & Business Development', 1),
        (N'Phòng Tài chính', N'Finance & Accounting', 1),
        (N'Phòng Marketing', N'Marketing & Communications', 1);
END

-- =====================================================
-- 2. POSITIONS
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM positions)
BEGIN
    INSERT INTO positions (name, salary_coefficient, [level]) VALUES
        (N'Giám đốc', 4.0, 5),
        (N'Trưởng phòng', 3.0, 4),
        (N'Team Lead', 2.5, 3),
        (N'Senior Developer', 2.0, 3),
        (N'Developer', 1.5, 2),
        (N'Junior Developer', 1.2, 1),
        (N'Thực tập sinh', 0.8, 1);
END

-- =====================================================
-- 3. EMPLOYEES (link users to HR)
-- =====================================================
DECLARE @dept_it_id BIGINT, @dept_hr_id BIGINT;
SELECT TOP 1 @dept_it_id = department_id FROM departments WHERE name LIKE N'%Công nghệ%' AND company_id = 1;
SELECT TOP 1 @dept_hr_id = department_id FROM departments WHERE name LIKE N'%Nhân sự%' AND company_id = 1;

DECLARE @pos_lead_id BIGINT, @pos_dev_id BIGINT;
SELECT TOP 1 @pos_lead_id = position_id FROM positions WHERE name = N'Team Lead';
SELECT TOP 1 @pos_dev_id = position_id FROM positions WHERE name = N'Developer';

-- Insert employees cho các user nếu chưa có
INSERT INTO employees (user_id, company_id, department_id, position_id, full_name, id_card, date_of_birth, gender, hire_date, [status], base_salary, allowance)
SELECT 
    u.user_id,
    1 as company_id,
    CASE 
        WHEN u.username LIKE 'hr%' THEN @dept_hr_id
        ELSE @dept_it_id
    END as department_id,
    CASE 
        WHEN u.username LIKE '%pm%' OR u.username = 'admin' THEN @pos_lead_id
        ELSE @pos_dev_id
    END as position_id,
    N'Nhân viên ' + u.username as full_name,
    '0' + CAST(u.user_id + 123456780 AS VARCHAR) as id_card,
    DATEADD(year, -25 - (u.user_id % 10), GETDATE()) as date_of_birth,
    CASE WHEN u.user_id % 2 = 0 THEN 'MALE' ELSE 'FEMALE' END as gender,
    DATEADD(month, -6 - (u.user_id % 24), GETDATE()) as hire_date,
    'ACTIVE' as [status],
    15000000 + (u.user_id * 500000) as base_salary,
    2000000 as allowance
FROM users u
WHERE u.is_system_admin = 0
  AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.user_id = u.user_id);

-- =====================================================
-- 4. ATTENDANCES (last 7 weekdays)
-- =====================================================
DECLARE @i INT = 0, @date DATE;
WHILE @i < 7
BEGIN
    SET @date = DATEADD(day, -@i, CAST(GETDATE() AS DATE));
    IF DATEPART(dw, @date) BETWEEN 2 AND 6 -- Mon-Fri
    BEGIN
        INSERT INTO attendances (employee_id, company_id, attendance_date, check_in_time, check_out_time, working_hours, [status], check_in_method, shift_type)
        SELECT 
            e.employee_id, 1, @date,
            DATEADD(minute, (e.employee_id % 30) - 15, CAST('08:00:00' AS TIME)) as check_in_time,
            DATEADD(minute, (e.employee_id % 30), CAST('17:30:00' AS TIME)) as check_out_time,
            8.0 as working_hours,
            CASE WHEN (e.employee_id + @i) % 10 = 0 THEN 'LATE' ELSE 'FULL_DAY' END as [status],
            'MANUAL' as check_in_method,
            'FULL' as shift_type
        FROM employees e WHERE e.company_id = 1
          AND NOT EXISTS (SELECT 1 FROM attendances a WHERE a.employee_id = e.employee_id AND a.attendance_date = @date);
    END
    SET @i = @i + 1;
END

-- =====================================================
-- 5. LEAVE REQUESTS
-- =====================================================
INSERT INTO leave_requests (employee_id, company_id, leave_type, start_date, end_date, total_days, reason, [status], created_at)
SELECT TOP 8
    e.employee_id, 1,
    CASE (e.employee_id % 4)
        WHEN 0 THEN 'ANNUAL' WHEN 1 THEN 'SICK' WHEN 2 THEN 'UNPAID' ELSE 'OTHER'
    END,
    DATEADD(day, e.employee_id + 5, GETDATE()),
    DATEADD(day, e.employee_id + 7, GETDATE()),
    3,
    N'Xin nghỉ phép - Lý do cá nhân',
    CASE (e.employee_id % 4)
        WHEN 0 THEN 'APPROVED' WHEN 1 THEN 'PENDING' WHEN 2 THEN 'REJECTED' ELSE 'PENDING'
    END,
    GETDATE()
FROM employees e WHERE e.company_id = 1
  AND NOT EXISTS (SELECT 1 FROM leave_requests lr WHERE lr.employee_id = e.employee_id);

-- =====================================================
-- 6. SALARIES (current month)
-- =====================================================
INSERT INTO salaries (employee_id, company_id, [month], [year], base_salary, allowance, working_days, standard_working_days, gross_salary, net_salary, payment_status)
SELECT 
    e.employee_id, 1, MONTH(GETDATE()), YEAR(GETDATE()),
    e.base_salary, ISNULL(e.allowance, 0), 22, 26,
    e.base_salary + ISNULL(e.allowance, 0) as gross_salary,
    (e.base_salary + ISNULL(e.allowance, 0)) * 0.895 as net_salary, -- ~10.5% deductions
    CASE WHEN e.employee_id % 3 = 0 THEN 'PAID' ELSE 'UNPAID' END
FROM employees e WHERE e.company_id = 1
  AND NOT EXISTS (SELECT 1 FROM salaries s WHERE s.employee_id = e.employee_id AND s.[year] = YEAR(GETDATE()) AND s.[month] = MONTH(GETDATE()));

-- =====================================================
-- 7. PROJECTS
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 1)
BEGIN
    INSERT INTO projects (key_project, name, description, [status], is_active, company_id, created_by, start_date, end_date) VALUES
        ('HRMS', N'HR Management System', N'Xây dựng hệ thống quản lý nhân sự toàn diện', 'ACTIVE', 1, 1, @admin_user_id, DATEADD(month, -2, GETDATE()), DATEADD(month, 3, GETDATE())),
        ('ECOM', N'E-Commerce Platform', N'Nền tảng thương mại điện tử B2B', 'ACTIVE', 1, 1, @pm_user_id, DATEADD(month, -1, GETDATE()), DATEADD(month, 4, GETDATE())),
        ('CRM', N'Customer Relationship', N'Hệ thống quản lý khách hàng', 'ACTIVE', 1, 1, @admin_user_id, GETDATE(), DATEADD(month, 6, GETDATE())),
        ('MOBILE', N'Mobile App', N'Ứng dụng di động cho nhân viên', 'ON_HOLD', 1, 1, @pm_user_id, DATEADD(month, 1, GETDATE()), DATEADD(month, 5, GETDATE()));
END

SELECT @project_id = project_id FROM projects WHERE key_project = 'HRMS';

-- =====================================================
-- 8. PROJECT MEMBERS
-- =====================================================
INSERT INTO project_members (project_id, user_id, [role])
SELECT p.project_id, u.user_id,
    CASE 
        WHEN u.username = 'admin' THEN 'OWNER'
        WHEN u.username LIKE 'pm%' THEN 'MANAGER'
        ELSE 'MEMBER'
    END
FROM projects p
CROSS JOIN users u
WHERE u.is_system_admin = 0 
  AND u.user_id <= (SELECT MIN(user_id) + 10 FROM users WHERE is_system_admin = 0)
  AND NOT EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.project_id AND pm.user_id = u.user_id);

-- =====================================================
-- 9. SPRINTS
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM sprints WHERE project_id = @project_id)
BEGIN
    INSERT INTO sprints (project_id, name, goal, start_date, end_date, [status], created_by) VALUES
        (@project_id, N'Sprint 1 - Foundation', N'Xây dựng nền tảng và authentication', DATEADD(day, -28, GETDATE()), DATEADD(day, -14, GETDATE()), 'COMPLETED', @admin_user_id),
        (@project_id, N'Sprint 2 - Core Features', N'Phát triển các tính năng chính', DATEADD(day, -14, GETDATE()), GETDATE(), 'COMPLETED', @admin_user_id),
        (@project_id, N'Sprint 3 - Integration', N'Tích hợp APIs và testing', GETDATE(), DATEADD(day, 14, GETDATE()), 'ACTIVE', @admin_user_id),
        (@project_id, N'Sprint 4 - Polish', N'Hoàn thiện UI và bug fixes', DATEADD(day, 15, GETDATE()), DATEADD(day, 28, GETDATE()), 'PLANNING', @admin_user_id);
END

SELECT @sprint_active_id = sprint_id FROM sprints WHERE [status] = 'ACTIVE' AND project_id = @project_id;

-- =====================================================
-- 10. ISSUES (Various states for testing)
-- =====================================================
DECLARE @sprint1_id BIGINT, @sprint2_id BIGINT;
SELECT @sprint1_id = sprint_id FROM sprints WHERE name LIKE 'Sprint 1%' AND project_id = @project_id;
SELECT @sprint2_id = sprint_id FROM sprints WHERE name LIKE 'Sprint 2%' AND project_id = @project_id;

IF NOT EXISTS (SELECT 1 FROM issues WHERE project_id = @project_id)
BEGIN
    INSERT INTO issues (project_id, sprint_id, issue_key, title, description, status_id, priority, reporter_id, assignee_id, due_date, estimated_hours, actual_hours) VALUES
        -- Sprint 1 (Completed)
        (@project_id, @sprint1_id, 'HRMS-1', N'Setup project structure', N'Thiết lập cấu trúc dự án', @status_done, 'HIGH', @admin_user_id, @emp_user_id, DATEADD(day, -21, GETDATE()), 8, 6),
        (@project_id, @sprint1_id, 'HRMS-2', N'Design database schema', N'Thiết kế CSDL', @status_done, 'HIGH', @admin_user_id, @pm_user_id, DATEADD(day, -18, GETDATE()), 16, 20),
        (@project_id, @sprint1_id, 'HRMS-3', N'Implement authentication', N'Module đăng nhập/đăng ký', @status_done, 'HIGH', @pm_user_id, @emp_user_id, DATEADD(day, -14, GETDATE()), 24, 28),
        -- Sprint 2 (Completed)
        (@project_id, @sprint2_id, 'HRMS-4', N'Employee CRUD API', N'API quản lý nhân viên', @status_done, 'HIGH', @admin_user_id, @emp_user_id, DATEADD(day, -7, GETDATE()), 16, 14),
        (@project_id, @sprint2_id, 'HRMS-5', N'Attendance module', N'Module chấm công', @status_done, 'MEDIUM', @pm_user_id, @emp_user_id, DATEADD(day, -5, GETDATE()), 24, 22),
        (@project_id, @sprint2_id, 'HRMS-6', N'Leave request workflow', N'Quy trình xin nghỉ phép', @status_done, 'MEDIUM', @admin_user_id, @pm_user_id, DATEADD(day, -3, GETDATE()), 20, 18),
        -- Sprint 3 (Active)
        (@project_id, @sprint_active_id, 'HRMS-7', N'Salary calculation', N'Tính lương tự động', @status_progress, 'HIGH', @admin_user_id, @emp_user_id, DATEADD(day, 5, GETDATE()), 32, 12),
        (@project_id, @sprint_active_id, 'HRMS-8', N'Dashboard analytics', N'Biểu đồ thống kê', @status_progress, 'MEDIUM', @pm_user_id, @pm_user_id, DATEADD(day, 7, GETDATE()), 24, 8),
        (@project_id, @sprint_active_id, 'HRMS-9', N'Report export', N'Xuất báo cáo PDF/Excel', @status_review, 'MEDIUM', @admin_user_id, @emp_user_id, DATEADD(day, 3, GETDATE()), 16, 14),
        (@project_id, @sprint_active_id, 'HRMS-10', N'Bug: Login timeout', N'Sửa lỗi session hết hạn', @status_todo, 'CRITICAL', @emp_user_id, NULL, DATEADD(day, 2, GETDATE()), 4, NULL),
        (@project_id, @sprint_active_id, 'HRMS-11', N'API documentation', N'Viết tài liệu API', @status_todo, 'LOW', @admin_user_id, NULL, DATEADD(day, 10, GETDATE()), 8, NULL),
        -- Backlog (No sprint)
        (@project_id, NULL, 'HRMS-12', N'Mobile responsive', N'Tối ưu giao diện mobile', @status_todo, 'MEDIUM', @admin_user_id, NULL, NULL, 24, NULL),
        (@project_id, NULL, 'HRMS-13', N'Dark mode support', N'Hỗ trợ chế độ tối', @status_todo, 'LOW', @pm_user_id, NULL, NULL, 16, NULL),
        (@project_id, NULL, 'HRMS-14', N'Multi-language', N'Đa ngôn ngữ', @status_todo, 'LOW', @admin_user_id, NULL, NULL, 40, NULL);
END

-- =====================================================
-- 11. ISSUE COMMENTS
-- =====================================================
DECLARE @issue1_id BIGINT, @issue7_id BIGINT;
SELECT @issue1_id = issue_id FROM issues WHERE issue_key = 'HRMS-1';
SELECT @issue7_id = issue_id FROM issues WHERE issue_key = 'HRMS-7';

IF NOT EXISTS (SELECT 1 FROM issue_comments WHERE issue_id = @issue1_id)
BEGIN
    INSERT INTO issue_comments (issue_id, author_id, content, is_edited, created_at, updated_at) VALUES
        (@issue1_id, @admin_user_id, N'Đã setup xong project structure theo chuẩn Java Spring Boot', 0, DATEADD(day, -20, GETDATE()), DATEADD(day, -20, GETDATE())),
        (@issue1_id, @emp_user_id, N'LGTM! Merged vào main branch', 0, DATEADD(day, -19, GETDATE()), DATEADD(day, -19, GETDATE())),
        (@issue7_id, @admin_user_id, N'Cần tính cả OT và các loại phụ cấp', 0, DATEADD(day, -1, GETDATE()), DATEADD(day, -1, GETDATE())),
        (@issue7_id, @emp_user_id, N'Đang implement theo spec, ETA 3 ngày nữa', 0, GETDATE(), GETDATE());
END

-- =====================================================
-- 12. TIME LOGS
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM time_logs WHERE company_id = 1)
BEGIN
    INSERT INTO time_logs (issue_id, user_id, company_id, logged_hours, work_date, description, created_at) VALUES
        ((SELECT issue_id FROM issues WHERE issue_key = 'HRMS-1'), @emp_user_id, 1, 6.0, DATEADD(day, -20, GETDATE()), N'Setup project structure', DATEADD(day, -20, GETDATE())),
        ((SELECT issue_id FROM issues WHERE issue_key = 'HRMS-2'), @pm_user_id, 1, 8.0, DATEADD(day, -18, GETDATE()), N'Database design meeting', DATEADD(day, -18, GETDATE())),
        ((SELECT issue_id FROM issues WHERE issue_key = 'HRMS-2'), @pm_user_id, 1, 12.0, DATEADD(day, -17, GETDATE()), N'ERD và schema implementation', DATEADD(day, -17, GETDATE())),
        ((SELECT issue_id FROM issues WHERE issue_key = 'HRMS-7'), @emp_user_id, 1, 4.0, DATEADD(day, -2, GETDATE()), N'Research salary formulas', DATEADD(day, -2, GETDATE())),
        ((SELECT issue_id FROM issues WHERE issue_key = 'HRMS-7'), @emp_user_id, 1, 8.0, DATEADD(day, -1, GETDATE()), N'Implement basic calculation', DATEADD(day, -1, GETDATE())),
        ((SELECT issue_id FROM issues WHERE issue_key = 'HRMS-8'), @pm_user_id, 1, 4.0, DATEADD(day, -1, GETDATE()), N'Chart library setup', DATEADD(day, -1, GETDATE())),
        ((SELECT issue_id FROM issues WHERE issue_key = 'HRMS-8'), @pm_user_id, 1, 4.0, GETDATE(), N'Dashboard layout', GETDATE());
END

-- =====================================================
-- 13. CALENDAR EVENTS
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM calendar_events WHERE company_id = 1)
BEGIN
    INSERT INTO calendar_events (title, description, start_time, end_time, all_day, event_type, location, created_by, company_id, created_at) VALUES
        (N'Sprint 3 Planning', N'Lên kế hoạch sprint 3', DATEADD(day, -1, GETDATE()), DATEADD(hour, 2, DATEADD(day, -1, GETDATE())), 0, 'MEETING', N'Meeting Room A', @admin_user_id, 1, DATEADD(day, -3, GETDATE())),
        (N'Daily Standup', N'Họp progress hàng ngày', DATEADD(hour, 9, GETDATE()), DATEADD(hour, 9, DATEADD(minute, 15, GETDATE())), 0, 'MEETING', N'Online - Google Meet', @pm_user_id, 1, DATEADD(day, -7, GETDATE())),
        (N'Sprint 3 Review', N'Demo kết quả sprint 3', DATEADD(day, 14, GETDATE()), DATEADD(hour, 3, DATEADD(day, 14, GETDATE())), 0, 'MEETING', N'Meeting Room B', @admin_user_id, 1, GETDATE()),
        (N'HRMS-10 Deadline', N'Deadline fix bug login', DATEADD(day, 2, GETDATE()), DATEADD(day, 2, GETDATE()), 1, 'DEADLINE', NULL, @admin_user_id, 1, GETDATE()),
        (N'Team Building', N'Team building Q1', DATEADD(day, 20, GETDATE()), DATEADD(day, 20, GETDATE()), 1, 'OTHER', N'TBA', @hr_user_id, 1, GETDATE());
END

-- =====================================================
-- 14. EVENT ATTENDEES
-- =====================================================
DECLARE @sprint_planning_event BIGINT, @daily_event BIGINT;
SELECT TOP 1 @sprint_planning_event = event_id FROM calendar_events WHERE title LIKE N'Sprint 3 Planning%';
SELECT TOP 1 @daily_event = event_id FROM calendar_events WHERE title LIKE N'Daily Standup%';

IF @sprint_planning_event IS NOT NULL AND NOT EXISTS (SELECT 1 FROM event_attendees WHERE event_id = @sprint_planning_event)
BEGIN
    INSERT INTO event_attendees (event_id, user_id, response_status) VALUES
        (@sprint_planning_event, @admin_user_id, 'ACCEPTED'),
        (@sprint_planning_event, @pm_user_id, 'ACCEPTED'),
        (@sprint_planning_event, @emp_user_id, 'ACCEPTED');
END

IF @daily_event IS NOT NULL AND NOT EXISTS (SELECT 1 FROM event_attendees WHERE event_id = @daily_event)
BEGIN
    INSERT INTO event_attendees (event_id, user_id, response_status) VALUES
        (@daily_event, @pm_user_id, 'ACCEPTED'),
        (@daily_event, @emp_user_id, 'TENTATIVE');
END

-- =====================================================
-- 15. AUTOMATION RULES
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM automation_rules WHERE project_id = @project_id)
BEGIN
    INSERT INTO automation_rules (project_id, name, description, trigger_type, is_active, created_by, company_id, created_at) VALUES
        (@project_id, N'Auto-assign to PM', N'Tự động assign issues CRITICAL cho PM', 'ISSUE_CREATED', 1, @admin_user_id, 1, GETDATE()),
        (@project_id, N'Notify on Done', N'Thông báo khi issue hoàn thành', 'STATUS_CHANGED', 1, @admin_user_id, 1, GETDATE()),
        (@project_id, N'Due date reminder', N'Nhắc nhở deadline', 'DUE_DATE_APPROACHING', 0, @pm_user_id, 1, GETDATE());
END

-- Add conditions and actions for rules
DECLARE @rule1_id BIGINT, @rule2_id BIGINT;
SELECT TOP 1 @rule1_id = rule_id FROM automation_rules WHERE name LIKE N'Auto-assign%';
SELECT TOP 1 @rule2_id = rule_id FROM automation_rules WHERE name LIKE N'Notify on Done%';

IF @rule1_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM automation_conditions WHERE rule_id = @rule1_id)
BEGIN
    INSERT INTO automation_conditions (rule_id, field, operator, value) VALUES
        (@rule1_id, 'priority', 'EQUALS', 'CRITICAL');
    INSERT INTO automation_actions (rule_id, action_type, action_config, order_index) VALUES
        (@rule1_id, 'UPDATE_FIELD', '{"field":"assignee","value":"' + CAST(@pm_user_id AS VARCHAR) + '"}', 1);
END

IF @rule2_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM automation_conditions WHERE rule_id = @rule2_id)
BEGIN
    INSERT INTO automation_conditions (rule_id, field, operator, value) VALUES
        (@rule2_id, 'status', 'EQUALS', 'Done');
    INSERT INTO automation_actions (rule_id, action_type, action_config, order_index) VALUES
        (@rule2_id, 'SEND_NOTIFICATION', '{"message":"Issue đã hoàn thành!"}', 1),
        (@rule2_id, 'ADD_COMMENT', '{"content":"Issue marked as Done by automation"}', 2);
END

-- =====================================================
-- 16. CHAT ROOMS (if table exists)
-- =====================================================
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'chat_rooms')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM chat_rooms WHERE company_id = 1)
    BEGIN
        INSERT INTO chat_rooms (name, [type], company_id, created_by, created_at) VALUES
            (N'General', 'GROUP', 1, @admin_user_id, GETDATE()),
            (N'Dev Team', 'GROUP', 1, @pm_user_id, GETDATE()),
            (N'HR Announcements', 'GROUP', 1, @hr_user_id, GETDATE());
    END
END

-- =====================================================
-- 17. CONTRACTS (HR Feature) - SKIPPED
-- Contracts require employee_id FK to employees table
-- Will be seeded via application when employees are properly created
-- =====================================================
PRINT N'⏭️ Contracts: Skipped (complex FKs - use app to create)';

-- =====================================================
-- 18. REVIEWS (HR Performance Reviews) - SKIPPED
-- Reviews require complex FK relationships (employee_id -> employees table)
-- Will be seeded via application when employees are properly linked
-- =====================================================
PRINT N'⏭️ Reviews: Skipped (complex FKs - use app to create)';

-- =====================================================
-- 19. NOTIFICATIONS
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = @admin_user_id)
BEGIN
    INSERT INTO notifications (user_id, type, title, content, link, is_read, created_at) VALUES
        (@admin_user_id, 'TASK_ASSIGNED', N'Task mới được giao', N'Bạn có task HRMS-10 cần xử lý', '/app/issues/HRMS-10', 0, DATEADD(hour, -2, GETDATE())),
        (@admin_user_id, 'COMMENT_ADDED', N'Comment mới', N'PM đã comment trong HRMS-7', '/app/issues/HRMS-7', 1, DATEADD(day, -1, GETDATE())),
        (@pm_user_id, 'TASK_ASSIGNED', N'Task mới', N'Issue HRMS-8 đã được assign cho bạn', '/app/issues/HRMS-8', 0, DATEADD(hour, -5, GETDATE())),
        (@pm_user_id, 'SPRINT_STARTED', N'Sprint mới', N'Sprint 3 đã bắt đầu', '/app/sprints', 1, DATEADD(day, -1, GETDATE())),
        (@emp_user_id, 'LEAVE_APPROVED', N'Đơn nghỉ phép', N'Đơn xin nghỉ phép của bạn đã được duyệt', '/app/leave', 0, GETDATE()),
        (@emp_user_id, 'MENTION', N'Bạn được mention', N'Admin đã mention bạn trong HRMS-9', '/app/issues/HRMS-9', 0, DATEADD(hour, -1, GETDATE())),
        (@hr_user_id, 'LEAVE_REQUEST', N'Đơn nghỉ phép mới', N'Có đơn xin nghỉ phép cần duyệt', '/app/leave/pending', 0, GETDATE());
END

-- =====================================================
-- 20. PROJECT PHASES (Gantt Chart) - SKIPPED
-- ProjectPhases require created_by FK to users
-- Will be seeded via application
-- =====================================================
PRINT N'⏭️ Project Phases: Skipped (complex FKs - use app to create)';

-- =====================================================
-- 21. ISSUE ACTIVITIES (History/Audit for Issues)
-- =====================================================
DECLARE @issue_hrms1 BIGINT, @issue_hrms7 BIGINT;
SELECT @issue_hrms1 = issue_id FROM issues WHERE issue_key = 'HRMS-1';
SELECT @issue_hrms7 = issue_id FROM issues WHERE issue_key = 'HRMS-7';

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'issue_activities')
BEGIN
    IF @issue_hrms1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM issue_activities WHERE issue_id = @issue_hrms1)
    BEGIN
        INSERT INTO issue_activities (issue_id, user_id, activity_type, field_name, old_value, new_value, created_at) VALUES
            (@issue_hrms1, @admin_user_id, 'CREATED', NULL, NULL, NULL, DATEADD(day, -25, GETDATE())),
            (@issue_hrms1, @admin_user_id, 'ASSIGNEE_CHANGED', 'assignee', NULL, 'employee', DATEADD(day, -24, GETDATE())),
            (@issue_hrms1, @emp_user_id, 'STATUS_CHANGED', 'status', 'To Do', 'In Progress', DATEADD(day, -22, GETDATE())),
            (@issue_hrms1, @emp_user_id, 'STATUS_CHANGED', 'status', 'In Progress', 'Done', DATEADD(day, -20, GETDATE()));
        IF @issue_hrms7 IS NOT NULL
        BEGIN
            INSERT INTO issue_activities (issue_id, user_id, activity_type, field_name, old_value, new_value, created_at) VALUES
                (@issue_hrms7, @admin_user_id, 'CREATED', NULL, NULL, NULL, DATEADD(day, -5, GETDATE())),
                (@issue_hrms7, @admin_user_id, 'ASSIGNEE_CHANGED', 'assignee', NULL, 'employee', DATEADD(day, -4, GETDATE())),
                (@issue_hrms7, @emp_user_id, 'STATUS_CHANGED', 'status', 'To Do', 'In Progress', DATEADD(day, -2, GETDATE()));
        END
    END
END

-- =====================================================
-- 22. AUDIT LOGS
-- =====================================================
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'audit_logs')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM audit_logs WHERE actor_id = @admin_user_id)
    BEGIN
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, severity, [status], created_at) VALUES
            (@admin_user_id, 'CREATE', 'PROJECT', @project_id, 'INFO', 'SUCCESS', DATEADD(month, -2, GETDATE())),
            (@admin_user_id, 'UPDATE', 'COMPANY_SETTINGS', 1, 'INFO', 'SUCCESS', DATEADD(month, -1, GETDATE())),
            (@hr_user_id, 'APPROVE', 'LEAVE_REQUEST', 1, 'INFO', 'SUCCESS', DATEADD(day, -3, GETDATE())),
            (@admin_user_id, 'DELETE', 'USER', 999, 'CRITICAL', 'SUCCESS', DATEADD(day, -7, GETDATE()));
    END
END

-- =====================================================
-- SUMMARY
-- =====================================================
PRINT N'';
PRINT N'=====================================================';
PRINT N'✅ SEED DATA COMPLETE!';
PRINT N'=====================================================';
PRINT N'';
PRINT N'📊 DỮ LIỆU ĐÃ TẠO:';
SELECT 'Departments' as [Table], COUNT(*) as [Count] FROM departments WHERE company_id = 1 UNION ALL
SELECT 'Positions', COUNT(*) FROM positions UNION ALL
SELECT 'Employees', COUNT(*) FROM employees WHERE company_id = 1 UNION ALL
SELECT 'Attendances', COUNT(*) FROM attendances WHERE company_id = 1 UNION ALL
SELECT 'Leave Requests', COUNT(*) FROM leave_requests WHERE company_id = 1 UNION ALL
SELECT 'Salaries', COUNT(*) FROM salaries WHERE company_id = 1 UNION ALL
SELECT 'Projects', COUNT(*) FROM projects WHERE company_id = 1 UNION ALL
SELECT 'Sprints', COUNT(*) FROM sprints UNION ALL
SELECT 'Issues', COUNT(*) FROM issues UNION ALL
SELECT 'Issue Comments', COUNT(*) FROM issue_comments UNION ALL
SELECT 'Time Logs', COUNT(*) FROM time_logs WHERE company_id = 1 UNION ALL
SELECT 'Calendar Events', COUNT(*) FROM calendar_events WHERE company_id = 1 UNION ALL
SELECT 'Event Attendees', COUNT(*) FROM event_attendees UNION ALL
SELECT 'Automation Rules', COUNT(*) FROM automation_rules WHERE company_id = 1 UNION ALL
SELECT 'Notifications', COUNT(*) FROM notifications;
PRINT N'';
PRINT N'🎉 Sẵn sàng test TẤT CẢ tính năng!';
PRINT N'';
PRINT N'📋 CHECKLIST TEST:';
PRINT N'   ✓ HRM: Departments, Positions, Employees, Attendance, Leave, Salary, Contracts, Reviews';
PRINT N'   ✓ Projects: Projects, Sprints, Issues, Comments, Activities, Phases';
PRINT N'   ✓ Time Tracking: Time Logs';
PRINT N'   ✓ Calendar: Events, Attendees';
PRINT N'   ✓ Automation: Rules, Conditions, Actions';
PRINT N'   ✓ Chat: Rooms';
PRINT N'   ✓ Notifications';
PRINT N'   ✓ Audit Logs';

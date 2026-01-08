-- =====================================================
-- Performance Optimization - Database Indexes
-- Enterprise Management System
-- =====================================================
-- Run this script on SQL Server database

-- =====================================================
-- USER MODULE
-- =====================================================
-- User lookup by email (login)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_user_email')
    CREATE INDEX idx_user_email ON users(email);

-- User lookup by username (login)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_user_username')
    CREATE INDEX idx_user_username ON users(username);

-- User active status filter
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_user_active')
    CREATE INDEX idx_user_active ON users(is_active, is_deleted);

-- =====================================================
-- COMPANY MODULE
-- =====================================================
-- Company member lookup
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_company_member_user')
    CREATE INDEX idx_company_member_user ON company_members(user_id, company_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_company_member_company')
    CREATE INDEX idx_company_member_company ON company_members(company_id, is_active);

-- =====================================================
-- HRM MODULE
-- =====================================================
-- Employee by user
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_employee_user')
    CREATE INDEX idx_employee_user ON employees(user_id);

-- Employee by department
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_employee_department')
    CREATE INDEX idx_employee_department ON employees(department_id);

-- Employee by position
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_employee_position')
    CREATE INDEX idx_employee_position ON employees(position_id);

-- Employee by company
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_employee_company')
    CREATE INDEX idx_employee_company ON employees(company_id, status);

-- Attendance by employee and date (most common query)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_attendance_employee_date')
    CREATE INDEX idx_attendance_employee_date ON attendances(employee_id, attendance_date DESC);

-- Attendance by company and date
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_attendance_company_date')
    CREATE INDEX idx_attendance_company_date ON attendances(company_id, attendance_date DESC);

-- Leave request by employee
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_leave_employee')
    CREATE INDEX idx_leave_employee ON leave_requests(employee_id, status);

-- Leave request by company
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_leave_company')
    CREATE INDEX idx_leave_company ON leave_requests(company_id, status);

-- Salary by employee and period
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_salary_employee_period')
    CREATE INDEX idx_salary_employee_period ON salaries(employee_id, year, month);

-- =====================================================
-- PROJECT MODULE
-- =====================================================
-- Project by company
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_project_company')
    CREATE INDEX idx_project_company ON projects(company_id, status);

-- Project member lookup
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_project_member_project')
    CREATE INDEX idx_project_member_project ON project_members(project_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_project_member_user')
    CREATE INDEX idx_project_member_user ON project_members(user_id);

-- Issue by project
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_issue_project')
    CREATE INDEX idx_issue_project ON issues(project_id);

-- Issue by assignee
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_issue_assignee')
    CREATE INDEX idx_issue_assignee ON issues(assignee_id);

-- Issue by sprint
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_issue_sprint')
    CREATE INDEX idx_issue_sprint ON issues(sprint_id);

-- Sprint by project
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_sprint_project')
    CREATE INDEX idx_sprint_project ON sprints(project_id, status);

-- =====================================================
-- CHAT MODULE
-- =====================================================
-- Message by room (most common query)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_message_room_created')
    CREATE INDEX idx_message_room_created ON messages(room_id, created_at DESC);

-- Message by sender
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_message_sender')
    CREATE INDEX idx_message_sender ON messages(sender_id);

-- Chat room member lookup
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_chatroom_member_room')
    CREATE INDEX idx_chatroom_member_room ON chat_room_members(room_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_chatroom_member_user')
    CREATE INDEX idx_chatroom_member_user ON chat_room_members(user_id);

-- =====================================================
-- NOTIFICATION MODULE
-- =====================================================
-- Notification by user
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_notification_user')
    CREATE INDEX idx_notification_user ON notifications(user_id, is_read, created_at DESC);

-- =====================================================
-- STORAGE MODULE
-- =====================================================
-- File by owner
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_file_owner')
    CREATE INDEX idx_file_owner ON files(owner_id, is_deleted);

-- File by folder
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_file_folder')
    CREATE INDEX idx_file_folder ON files(folder_id);

-- =====================================================
-- ISSUE ACTIVITY MODULE (Supplemented)
-- =====================================================
-- Activity by Issue (Ordered by date)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_issue_activity_issue')
    CREATE INDEX idx_issue_activity_issue ON issue_activities(issue_id, created_at DESC);

-- Activity by User (My activities)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_issue_activity_user')
    CREATE INDEX idx_issue_activity_user ON issue_activities(user_id, created_at DESC);

PRINT 'All indexes created successfully!';

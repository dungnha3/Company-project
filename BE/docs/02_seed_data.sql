-- ============================================================================
-- GEMINI ERP - PRODUCTION-GRADE POSTGRESQL SEED DATA
-- File: 02_seed_data.sql
-- Description: Seeds employees, leave requests, projects, members, sprints,
--              issues, time logs, reviews, project_expenses, and workspace_join_requests.
-- Target Company: Tech Corp (Enterprise Plan, company_id = 1)
-- ============================================================================

-- ============================================================================
-- 7. EMPLOYEES (Detailed Profiles with Wages & Addresses)
-- ============================================================================
INSERT INTO employees (employee_id, user_id, company_id, company_member_id, full_name, id_card, date_of_birth, gender, address, phone, hire_date, status, base_salary, allowance, leave_balance, created_at, updated_at) VALUES
(1,  2, 1, 1, 'Nguyễn Thế Anh',    '024085002931', '1985-04-12', 'MALE',   '123 Nguyễn Trãi, P.Bến Thành, Q.1, TP.HCM',    '0901234567', '2020-01-01', 'ACTIVE', 45000000.00, 5000000.00, 12, NOW(), NOW()),
(2,  3, 1, 2, 'Trần Hoàng Nam',   '024088019283', '1988-08-20', 'MALE',   '456 Lê Lợi, P.Bến Nghé, Q.1, TP.HCM',         '0902345678', '2020-05-15', 'ACTIVE', 35000000.00, 4000000.00, 12, NOW(), NOW()),
(3,  4, 1, 3, 'Lê Thị Tuyết Mai', '024090001827', '1990-11-05', 'FEMALE', '789 Nguyễn Đình Chiểu, P.6, Q.3, TP.HCM',  '0903456789', '2021-02-10', 'ACTIVE', 28000000.00, 3000000.00, 11, NOW(), NOW()),
(4,  5, 1, 4, 'Phạm Thanh Sơn',   '024087002938', '1987-03-25', 'MALE',   '101 Hai Bà Trưng, P.Đa Kao, Q.1, TP.HCM',  '0904567890', '2021-03-01', 'ACTIVE', 25000000.00, 3000000.00, 12, NOW(), NOW()),
(5,  6, 1, 5, 'Vũ Minh Trí',     '024089008273', '1989-09-14', 'MALE',   '202 Điện Biên Phủ, P.15, Q.Bình Thạnh',   '0905678901', '2021-06-20', 'ACTIVE', 32000000.00, 4000000.00, 12, NOW(), NOW()),
(6,  7, 1, 6, 'Hoàng Quốc Bảo',  '024092003827', '1992-02-18', 'MALE',   '303 Cách Mạng T8, P.12, Q.10, TP.HCM',       '0906789012', '2022-01-15', 'ACTIVE', 28000000.00, 2500000.00, 12, NOW(), NOW()),
(7,  8, 1, 7, 'Nguyễn Song Hào',  '024095018273', '1995-07-22', 'MALE',   '404 Cộng Hòa, P.13, Q.Tân Bình, TP.HCM',  '0907890123', '2022-03-10', 'ACTIVE', 20000000.00, 2000000.00, 12, NOW(), NOW()),
(8,  9, 1, 8, 'Phan Huy Khánh',  '024094002938', '1994-05-30', 'MALE',   '505 Nguyễn Kiệm, P.9, Q.Phú Nhuận',       '0908901234', '2022-04-01', 'ACTIVE', 22000000.00, 2000000.00, 12, NOW(), NOW()),
(9, 10, 1, 9, 'Trương Đình Khoa', '024096001928', '1996-12-10', 'MALE',   '606 Võ Văn Ngân, P.Bình Thọ, TP.Thủ Đức', '0909012345', '2022-10-01', 'ACTIVE', 18000000.00, 1500000.00, 12, NOW(), NOW()),
(10, 11, 1, 10, 'Đỗ Thùy Trang',  '024097003928', '1997-06-15', 'FEMALE', '707 Lũy Bán Bích, P.Tân Thành, Q.Tân Phú',  '0909123456', '2023-01-10', 'ACTIVE', 16000000.00, 1500000.00, 12, NOW(), NOW()),
(11, 12, 1, 11, 'Nguyễn Văn Đạt', '024093002983', '1993-01-01', 'MALE',   '808 Hoàng Văn Thụ, P.2, Q.Tân Bình',     '0909999999', '2020-01-01', 'ACTIVE', 25000000.00, 2000000.00, 12, NOW(), NOW());

-- ============================================================================
-- 8. LEAVE REQUESTS (ANNUAL & SICK logs)
-- ============================================================================
INSERT INTO leave_requests (id, employee_id, company_id, leave_type, start_date, end_date, total_days, reason, status, created_at, updated_at) VALUES
(1, 3,  1, 'ANNUAL', CURRENT_DATE + INTERVAL '5 days',  CURRENT_DATE + INTERVAL '7 days',  3, 'Nghỉ phép năm gia đình đi du lịch nghỉ mát ở Đà Lạt',                             'PENDING',  NOW(), NOW()),
(2, 6,  1, 'ANNUAL', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '13 days', 3, 'Nghỉ phép thường niên đưa gia đình về quê ở Hà Tĩnh',                               'APPROVED', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
(3, 7,  1, 'SICK',  CURRENT_DATE - INTERVAL '5 days',  CURRENT_DATE - INTERVAL '4 days',  2, 'Nghỉ ốm điều trị sốt xuất huyết tại bệnh viện Quận 1',                      'APPROVED', NOW() - INTERVAL '5 days',  NOW() - INTERVAL '5 days'),
(4, 8,  1, 'UNPAID',CURRENT_DATE - INTERVAL '8 days',  CURRENT_DATE - INTERVAL '7 days',  2, 'Giải quyết việc tranh chấp đất đai cá nhân ở quê nhà',                         'REJECTED', NOW() - INTERVAL '8 days',  NOW() - INTERVAL '8 days'),
(5, 10, 1, 'ANNUAL', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '12 days', 3, 'Nghỉ phép năm chuẩn bị đám cưới em ruột ở Đồng Nai',                      'PENDING',  NOW(), NOW()),
(6, 11, 1, 'SICK',  CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE - INTERVAL '12 days', 1, 'Nghỉ ốm đi tái khám răng và trám răng sâu tại nha khoa',                    'APPROVED', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days');

-- ============================================================================
-- 12. PROJECTS (Active & Planned Portfolio)
-- ============================================================================
INSERT INTO projects (project_id, key_project, name, description, status, is_active, company_id, created_by, start_date, end_date, created_at, updated_at) VALUES
(1, 'HRMS', 'HR Management System',    'Hệ thống Quản lý Nhân lực, Chấm công bằng GPS, Tính lương Payroll tự động và Đánh giá hiệu suất nhân viên.', 'ACTIVE', true, 1, 2, CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '2 months', NOW() - INTERVAL '3 months', NOW()),
(2, 'ECOM', 'E-Commerce Platform',   'Xây dựng website bán hàng đa nền tảng, tích hợp cổng thanh toán VNPay/Momo và hệ thống đồng bộ hóa tồn kho.',          'ACTIVE', true, 1, 6, CURRENT_DATE - INTERVAL '1 month',  CURRENT_DATE + INTERVAL '4 months', NOW() - INTERVAL '1 month',  NOW()),
(3, 'MOBI', 'Employee Companion App', 'Ứng dụng di động đồng hành chạy bằng React Native, hỗ trợ nhân viên Check-in định vị và gửi đơn xin phép online.', 'ACTIVE', true, 1, 6, CURRENT_DATE + INTERVAL '1 month',  CURRENT_DATE + INTERVAL '5 months', NOW(), NOW());

-- ============================================================================
-- 9. REVIEWS (Performance Evaluations — tenant-scoped)
-- ============================================================================
INSERT INTO reviews (review_id, employee_id, reviewer_id, company_id, project_id, project_name, review_period, review_type, technical_score, attitude_score, soft_skills_score, teamwork_score, total_score, rating, comments, next_goals, development_plan, status, start_date, end_date, completed_date, created_at, updated_at) VALUES
-- Sprint Quick Reviews
(1,  6, 3, 1, 1, 'HR Management System', 'Quick-Sprint-1', 'SPRINT_REVIEW', 8.5, 8.0, 7.5, 8.0, 8.1, 'GOOD',         'Hoàn thành tốt sprint foundation. Kiến trúc hệ thống rõ ràng, code sạch.',         'Tiếp tục cải thiện tài liệu API và inline comments.', 'Nâng cao kỹ năng CI/CD pipeline.', 'APPROVED', CURRENT_DATE - INTERVAL '41 days', CURRENT_DATE - INTERVAL '42 days', CURRENT_DATE - INTERVAL '42 days', NOW(), NOW()),
(2,  7, 3, 1, 1, 'HR Management System', 'Quick-Sprint-1', 'SPRINT_REVIEW', 9.0, 8.5, 8.0, 8.5, 8.6, 'GOOD',         'Bảo làm việc xuất sắc, kiến trúc Spring Boot rất vững.',                          'Phát triển thêm kỹ năng React frontend để tự giao diện.',             'Kỹ năng DevOps và Docker.',                       'APPROVED', CURRENT_DATE - INTERVAL '41 days', CURRENT_DATE - INTERVAL '42 days', CURRENT_DATE - INTERVAL '42 days', NOW(), NOW()),
(3,  8, 3, 1, 1, 'HR Management System', 'Quick-Sprint-1', 'SPRINT_REVIEW', 8.0, 9.0, 9.0, 9.0, 8.7, 'GOOD',         'Giao diện Kanban đẹp, UX mượt mà. Teamwork xuất sắc.',                             'Học thêm về thiết kế hệ thống backend.',                       'Thiết kế hệ thống microservices.',                    'APPROVED', CURRENT_DATE - INTERVAL '41 days', CURRENT_DATE - INTERVAL '42 days', CURRENT_DATE - INTERVAL '42 days', NOW(), NOW()),
(4,  9, 3, 1, 1, 'HR Management System', 'Quick-Sprint-2', 'SPRINT_REVIEW', 8.0, 8.0, 7.5, 8.0, 7.9, 'SATISFACTORY', 'Hoàn thành API Employee CRUD đúng deadline. Cần cải thiện tốc độ code.',          'Rút kinh nghiệm về estimation và ước lượng thời gian.',              'Kỹ năng PostgreSQL nâng cao.',                     'APPROVED', CURRENT_DATE - INTERVAL '27 days', CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE - INTERVAL '28 days', NOW(), NOW()),
(5,  7, 3, 1, 1, 'HR Management System', 'Quick-Sprint-3', 'SPRINT_REVIEW', 9.5, 8.5, 8.0, 8.5, 8.8, 'GOOD',         'Hoàn thành xuất sắc module GPS Attendance. Performance rất tốt.',               'Dẫn dắt team nhỏ và pair programming.',                           'Technical Leadership.',                                'APPROVED', CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '14 days', NOW(), NOW()),
(6,  8, 3, 1, 1, 'HR Management System', 'Quick-Sprint-3', 'SPRINT_REVIEW', 8.5, 9.0, 9.0, 9.0, 8.9, 'GOOD',         'Dashboard HR đẹp, biểu đồ trực quan. Phối hợp tốt với backend.',               'Kỹ năng quản lý dự án và sprint planning.',              'Project Management (PMP).',                           'APPROVED', CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '14 days', NOW(), NOW()),
-- In-progress sprint reviews
(7,  7, 3, 1, NULL, NULL,                'Quick-Sprint-4', 'SPRINT_REVIEW', 9.0, 8.5, 8.5, 8.5, 8.7, NULL, 'WebSocket chat đang triển khai tốt. Dự kiến sẽ hoàn thành vượt kỳ vọng.', NULL, NULL, 'IN_PROGRESS', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE, NULL, NOW(), NOW()),
(8,  8, 3, 1, NULL, NULL,                'Quick-Sprint-4', 'SPRINT_REVIEW', 8.5, 8.5, 8.5, 9.0, 8.6, NULL, 'Biểu đồ Analytics và Burndown hoàn thành. Đang chờ PM review.', NULL, NULL, 'PENDING',     CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE, NULL, NOW(), NOW()),
-- Quarterly Periodic Reviews (Q1-2026)
(9,  6,  2, 1, 1, 'HR Management System', 'Q1-2026', 'PERIODIC', 8.5, 8.0, 7.5, 8.0, 8.1, 'GOOD',         'Đánh giá quý 1: Hoàn thành tốt vai trò PM. Quản lý sprint hiệu quả.',       'Cần cải thiện kỹ năng giao tiếp với khách hàng.',              'Giao tiếp và đàm phán với stakeholder.',                  'APPROVED', '2026-01-01', '2026-03-31', '2026-04-05', NOW(), NOW()),
(10, 7,  2, 1, 1, 'HR Management System', 'Q1-2026', 'PERIODIC', 9.0, 8.5, 8.5, 9.0, 8.8, 'GOOD',         'Đánh giá quý 1: Xuất sắc. Tech lead tự tin, code quality cao.',            'Tham gia khóa học System Design.',                               'System Design & Architecture.',                         'APPROVED', '2026-01-01', '2026-03-31', '2026-04-05', NOW(), NOW()),
(11, 8,  2, 1, 1, 'HR Management System', 'Q1-2026', 'PERIODIC', 8.0, 9.0, 9.0, 9.0, 8.7, 'GOOD',         'Đánh giá quý 1: Tốt. Giao diện người dùng rất chuyên nghiệp.',       'Kỹ năng backend để tự triển khai full-stack.',              'Full-stack development.',                              'APPROVED', '2026-01-01', '2026-03-31', '2026-04-05', NOW(), NOW()),
(12, 9,  2, 1, 1, 'HR Management System', 'Q1-2026', 'PERIODIC', 8.0, 8.0, 7.5, 8.0, 7.9, 'SATISFACTORY', 'Đánh giá quý 1: Đạt yêu cầu. Cần nỗ lực hơn trong team.',               'Tham gia thêm code review và pair programming.',            'Team collaboration & mentoring.',                       'APPROVED', '2026-01-01', '2026-03-31', '2026-04-05', NOW(), NOW()),
(13, 10, 2, 1, NULL, NULL,                'Q1-2026', 'PERIODIC', 8.0, 8.5, 8.0, 8.5, 8.2, 'GOOD',         'Đánh giá quý 1: Làm việc ổn định, đúng deadline.',                          'Kỹ năng React Native để phát triển mobile app.',            'Mobile development (React Native).',                      'APPROVED', '2026-01-01', '2026-03-31', '2026-04-05', NOW(), NOW()),
(14, 11, 2, 1, 1, 'HR Management System', 'Q1-2026', 'PERIODIC', 7.5, 8.0, 8.0, 8.0, 7.8, 'SATISFACTORY', 'Đánh giá quý 1: QA tốt, viết test case chi tiết.',                             'Học thêm automation testing framework.',                 'Test automation (Selenium/Cypress).',                    'APPROVED', '2026-01-01', '2026-03-31', '2026-04-05', NOW(), NOW());

-- ============================================================================
-- 10. PROJECT EXPENSES (tenant-scoped)
-- ============================================================================
INSERT INTO project_expenses (expense_id, project_id, expense_name, amount, expense_date, category, description, company_id, created_by, created_at, updated_at) VALUES
(1, 1, 'Thuê máy chủ cloud AWS (tháng 1)',           15000000.00, CURRENT_DATE - INTERVAL '30 days', 'INFRASTRUCTURE', 'Server EC2 t2.large cho môi trường staging và production',       1, 2, NOW() - INTERVAL '30 days', NOW()),
(2, 1, 'Mua domain SSL certificate',                  3500000.00, CURRENT_DATE - INTERVAL '25 days', 'LICENSE',        'SSL wildcard certificate cho *.techcorp.vn',                     1, 2, NOW() - INTERVAL '25 days', NOW()),
(3, 1, 'Chi phí thiết kế UI/UX logo và branding',       8000000.00, CURRENT_DATE - INTERVAL '20 days', 'DESIGN',         'Thiết kế logo, bộ nhận diện thương hiệu HRMS',            1, 2, NOW() - INTERVAL '20 days', NOW()),
(4, 1, 'Công cụ Jira Software license',               12000000.00, CURRENT_DATE - INTERVAL '15 days', 'LICENSE',        'Annual license Jira 10 người dùng',                            1, 2, NOW() - INTERVAL '15 days', NOW()),
(5, 1, 'Khóa đào tạo AWS Solutions Architect',        25000000.00, CURRENT_DATE - INTERVAL '10 days', 'TRAINING',       '2 nhân viên tham gia khóa học AWS certification',            1, 2, NOW() - INTERVAL '10 days', NOW()),
(6, 1, 'Marketing landing page Tech Corp HR',           5000000.00, CURRENT_DATE - INTERVAL '5 days',  'MARKETING',       'Chạy quảng cáo Google Ads cho landing page tuyển dụng',      1, 2, NOW() - INTERVAL '5 days',  NOW()),
(7, 2, 'Tích hợp cổng thanh toán VNPay',             10000000.00, CURRENT_DATE - INTERVAL '20 days', 'INTEGRATION',     'Phí tích hợp API thanh toán VNPay cho E-Commerce',            1, 6, NOW() - INTERVAL '20 days', NOW()),
(8, 2, 'Thiết kế UI/UX E-Commerce platform',          20000000.00, CURRENT_DATE - INTERVAL '15 days', 'DESIGN',         'Thiết kế giao diện mockup Figma cho trang sản phẩm và checkout', 1, 6, NOW() - INTERVAL '15 days', NOW());

-- ============================================================================
-- 11. WORKSPACE JOIN REQUESTS (tenant-scoped)
-- ============================================================================
INSERT INTO workspace_join_requests (request_id, company_id, user_id, status, reviewed_by, created_at, updated_at) VALUES
(1, 1, 7,  'APPROVED', 2, NOW() - INTERVAL '4 months', NOW() - INTERVAL '4 months'),
(2, 1, 8,  'APPROVED', 2, NOW() - INTERVAL '4 months', NOW() - INTERVAL '4 months'),
(3, 1, 9,  'APPROVED', 2, NOW() - INTERVAL '4 months', NOW() - INTERVAL '4 months'),
(4, 1, 10, 'APPROVED', 2, NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),
(5, 1, 11, 'APPROVED', 2, NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months');

-- ============================================================================
-- 13. PROJECT MEMBERS & ALLOCATIONS
-- ============================================================================
INSERT INTO project_members (id, project_id, user_id, role, position, allocation_rate, member_status, join_date, years_of_experience, billing_rate, skill_notes, created_at, updated_at) VALUES
(1, 1,  2, 'OWNER',   'Product Owner & CEO',            20, 'ACTIVE', CURRENT_DATE - INTERVAL '3 months', 15, 150000.00, 'Người định hướng sản phẩm và phê duyệt chi phí',               NOW() - INTERVAL '3 months', NOW()),
(2, 1,  6, 'MANAGER', 'Project Manager',                80, 'ACTIVE', CURRENT_DATE - INTERVAL '3 months',  8,  80000.00, 'Quản lý tiến độ dự án, điều phối công việc hàng ngày',       NOW() - INTERVAL '3 months', NOW()),
(3, 1,  7, 'MEMBER',  'Senior Backend Engineer',        100, 'ACTIVE', CURRENT_DATE - INTERVAL '3 months',  6,  60000.00, 'Thiết kế kiến trúc hệ thống, phát triển Spring Boot Core APIs', NOW() - INTERVAL '3 months', NOW()),
(4, 1,  8, 'MEMBER',  'Senior Frontend Developer',       100, 'ACTIVE', CURRENT_DATE - INTERVAL '3 months',  4,  45000.00, 'Xây dựng layout ReactJS và kết nối API, tối ưu UX',        NOW() - INTERVAL '3 months', NOW()),
(5, 1,  9, 'MEMBER',  'Backend Developer',              100, 'ACTIVE', CURRENT_DATE - INTERVAL '3 months',  3,  35000.00, 'Hỗ trợ code phần chấm công GPS và tính lương nhân viên', NOW() - INTERVAL '3 months', NOW()),
(6, 1, 11, 'MEMBER',  'QA Automation Lead',               50, 'ACTIVE', CURRENT_DATE - INTERVAL '3 months',  3,  30000.00, 'Viết test case tự động, đảm bảo chất lượng trước release', NOW() - INTERVAL '3 months', NOW()),
(7, 2,  6, 'OWNER',   'Product Owner',                   50, 'ACTIVE', CURRENT_DATE - INTERVAL '1 month',   8,  80000.00, 'Kiêm PO cho dự án bán hàng Thương mại điện tử',         NOW() - INTERVAL '1 month',  NOW()),
(8, 2,  7, 'MEMBER',  'Backend Architect',                50, 'ACTIVE', CURRENT_DATE - INTERVAL '1 month',   6,  60000.00, 'Thiết kế hệ cơ sở dữ liệu đồng bộ hóa kho hàng tốc độ cao', NOW() - INTERVAL '1 month',  NOW()),
(9, 2, 10, 'MEMBER',  'React Native Developer',         100, 'ACTIVE', CURRENT_DATE - INTERVAL '1 month',   4,  40000.00, 'Xây dựng ứng dụng mua sắm trên nền tảng di động Android/iOS', NOW() - INTERVAL '1 month',  NOW());

-- ============================================================================
-- 14. SPRINTS (Velocity & Burndown Chart Setup)
-- ============================================================================
INSERT INTO sprints (sprint_id, project_id, name, goal, start_date, end_date, status, created_by, created_at, updated_at) VALUES
(1, 1, 'Sprint 1 - Foundation',   'Thiết lập khung cấu trúc ứng dụng Maven, thiết kế ERD database hoàn chỉnh và triển khai Spring Security tích hợp JWT.',                        CURRENT_DATE - INTERVAL '56 days', CURRENT_DATE - INTERVAL '42 days', 'COMPLETED', 2, NOW() - INTERVAL '56 days', NOW() - INTERVAL '42 days'),
(2, 1, 'Sprint 2 - Core CRUD',  'Hoàn thành toàn bộ API và giao diện quản lý thông tin Nhân viên, quản trị phân quyền Công ty (Tenant isolation).',                                 CURRENT_DATE - INTERVAL '42 days', CURRENT_DATE - INTERVAL '28 days', 'COMPLETED', 2, NOW() - INTERVAL '42 days', NOW() - INTERVAL '28 days'),
(3, 1, 'Sprint 3 - HR Features','Tích hợp bản đồ GPS cho Chấm công Check-in/out, module Đơn nghỉ phép trực tuyến và tự động tính bảng lương hàng tháng.',                CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE - INTERVAL '14 days', 'COMPLETED', 2, NOW() - INTERVAL '28 days', NOW() - INTERVAL '14 days'),
(4, 1, 'Sprint 4 - Integration','Hoàn tất tải file lên Google Drive, hệ thống nhật ký hoạt động người dùng (Audit logs) và hiển thị biểu đồ Analytics.',                            CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE,                             'ACTIVE',   2, NOW() - INTERVAL '14 days', NOW()),
(5, 1, 'Sprint 5 - Polish',     'Tối ưu hóa tốc độ tải trang Kanban, sửa lỗi bảo mật token hết hạn sớm và tích hợp Trợ lý Trí tuệ nhân tạo Gemini AI.',              CURRENT_DATE + INTERVAL '1 day',   CURRENT_DATE + INTERVAL '15 days', 'PLANNING',  2, NOW(), NOW());

-- ============================================================================
-- 15. ISSUES (32 Real Tasks across Sprints with status/priorities/dates)
-- ============================================================================
INSERT INTO issues (issue_id, project_id, sprint_id, issue_key, title, description, status_id, priority, issue_type, order_index, reporter_id, assignee_id, estimated_hours, actual_hours, start_date, due_date, weight, is_important, is_urgent, rework_count, completed_at, created_at, updated_at) VALUES
-- Sprint 1 (COMPLETED) — 6 issues
(1,  1, 1, 'HRMS-1',  'Khởi tạo khung dự án Maven và các package Spring Boot',                    'Cấu hình file pom.xml, tích hợp các thư viện Spring Web, JPA, PostgreSQL Driver và phân nhóm folder.',                                          4, 'HIGH',     'TASK', 1,  2,  7,  8.00,  8.00, CURRENT_DATE - INTERVAL '56 days', CURRENT_DATE - INTERVAL '53 days', 2, true,  true,  0, NOW() - INTERVAL '53 days', NOW() - INTERVAL '56 days', NOW() - INTERVAL '53 days'),
(2,  1, 1, 'HRMS-2',  'Thiết kế Sơ đồ Cơ sở Dữ liệu (ERD Database Design)',                  'Vẽ sơ đồ ERD chi tiết cho phân hệ HRMS bao gồm phân bảng users, employees, projects, sprints, issues.',                           4, 'HIGH',     'TASK', 2,  2,  7, 16.00, 18.00, CURRENT_DATE - INTERVAL '55 days', CURRENT_DATE - INTERVAL '50 days', 5, true,  false, 0, NOW() - INTERVAL '50 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '50 days'),
(3,  1, 1, 'HRMS-3',  'Triển khai Spring Security và tích hợp mã hóa Token JWT',             'Cấu hình lớp bảo mật Spring Security, viết bộ lọc filter phân tích token JWT và xử lý phân quyền REST APIs.', 4, 'CRITICAL', 'TASK', 3,  2,  7, 24.00, 26.00, CURRENT_DATE - INTERVAL '52 days', CURRENT_DATE - INTERVAL '46 days', 8, true,  true,  1, NOW() - INTERVAL '45 days', NOW() - INTERVAL '52 days', NOW() - INTERVAL '45 days'),
(4,  1, 1, 'HRMS-4',  'Viết các API đăng ký, đăng nhập và quản lý User CRUD',                'Thiết kế RESTful API cho phép sysadmin tạo mới tài khoản và quản trị danh sách người dùng hệ thống.',                4, 'HIGH',     'TASK', 4,  2,  9, 16.00, 14.00, CURRENT_DATE - INTERVAL '50 days', CURRENT_DATE - INTERVAL '45 days', 4, false, true,  0, NOW() - INTERVAL '45 days', NOW() - INTERVAL '50 days', NOW() - INTERVAL '45 days'),
(5,  1, 1, 'HRMS-5',  'Cấu hình phân quyền CORS toàn cục & Lớp lọc bảo mật',               'Bảo đảm hệ thống chỉ cho phép các cổng Frontend chỉ định kết nối được phép giao tiếp với RESTful API.',      4, 'HIGH',     'TASK', 5,  2,  7,  8.00, 10.00, CURRENT_DATE - INTERVAL '46 days', CURRENT_DATE - INTERVAL '43 days', 2, false, false, 0, NOW() - INTERVAL '43 days', NOW() - INTERVAL '46 days', NOW() - INTERVAL '43 days'),
(6,  1, 1, 'HRMS-6',  'Xây dựng bộ kiểm soát lỗi tập trung GlobalExceptionHandler',       'Bắt toàn bộ các lỗi runtime exception để phản hồi định dạng JSON đồng nhất về phía Frontend ReactJS.',        4, 'MEDIUM',   'TASK', 6,  2,  8,  6.00,  5.00, CURRENT_DATE - INTERVAL '44 days', CURRENT_DATE - INTERVAL '42 days', 2, false, false, 0, NOW() - INTERVAL '42 days', NOW() - INTERVAL '44 days', NOW() - INTERVAL '42 days'),
-- Sprint 2 (COMPLETED) — 6 issues
(7,  1, 2, 'HRMS-7',  'API Quản lý thông tin hồ sơ chi tiết của Nhân sự (CRUD)',              'Xây dựng các API lưu hồ sơ nhân sự, mức lương cơ bản, ngày bắt đầu thử việc, số điện thoại và địa chỉ liên hệ.', 4, 'HIGH', 'TASK', 1,  2,  7, 16.00, 15.00, CURRENT_DATE - INTERVAL '42 days', CURRENT_DATE - INTERVAL '38 days', 5, true,  true,  0, NOW() - INTERVAL '38 days', NOW() - INTERVAL '42 days', NOW() - INTERVAL '38 days'),
(8,  1, 2, 'HRMS-8',  'Viết API thiết lập chức năng của Company Member và phân quyền',       'Cho phép OWNER phân chia các quyền năng quản trị hệ thống bằng định dạng JSON trong bảng company_members.',  4, 'HIGH',     'TASK', 2,  2,  8, 12.00, 10.00, CURRENT_DATE - INTERVAL '40 days', CURRENT_DATE - INTERVAL '36 days', 4, true,  false, 0, NOW() - INTERVAL '36 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '36 days'),
(9,  1, 2, 'HRMS-9',  'Thiết kế giao diện Kanban Board kéo thả danh sách công việc',        'Sử dụng React-beautiful-dnd xây dựng bảng Kanban cho phép kéo thả trạng thái các Issue thuận tiện nhất.',     4, 'HIGH',     'TASK', 3,  2,  8, 16.00, 18.00, CURRENT_DATE - INTERVAL '38 days', CURRENT_DATE - INTERVAL '32 days', 5, false, true,  1, NOW() - INTERVAL '31 days', NOW() - INTERVAL '38 days', NOW() - INTERVAL '31 days'),
(10, 1, 2, 'HRMS-10', 'API Cấu hình chung cho Công ty (Company Settings)',                   'Thiết lập các thông số chu kỳ đánh giá (Tháng/Quý/Năm) và công tắc bật tắt tự động nhắc nhở làm việc.', 4, 'HIGH',     'TASK', 4,  2,  7, 10.00, 12.00, CURRENT_DATE - INTERVAL '35 days', CURRENT_DATE - INTERVAL '31 days', 3, false, false, 0, NOW() - INTERVAL '31 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '31 days'),
(11, 1, 2, 'HRMS-11', 'Lớp bảo mật đa khách thuê (Multi-tenant data isolation)',             'Viết Hibernate Filter chặn toàn bộ truy vấn dữ liệu của các công ty khác nhau, bảo mật tuyệt đối dữ liệu.',  4, 'CRITICAL', 'TASK', 5,  2,  7, 20.00, 24.00, CURRENT_DATE - INTERVAL '32 days', CURRENT_DATE - INTERVAL '29 days', 7, true,  true,  0, NOW() - INTERVAL '28 days', NOW() - INTERVAL '32 days', NOW() - INTERVAL '28 days'),
(12, 1, 2, 'HRMS-12', 'Sửa lỗi và tối ưu công cụ tìm kiếm lọc danh sách nhân viên',        'Nâng cấp truy vấn SQL sử dụng Specification giúp lọc nhân sự nhanh chóng dưới 50ms.',                    4, 'MEDIUM',   'BUG',   6,  2,  8,  8.00,  8.00, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '28 days', 2, false, false, 0, NOW() - INTERVAL '28 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days'),
-- Sprint 3 (COMPLETED) — 7 issues
(13, 1, 3, 'HRMS-13', 'Xây dựng Module Chấm công định vị bản đồ bằng GPS',                 'Viết API kiểm tra kinh độ và vĩ độ của thiết bị di động nhân viên có nằm trong bán kính cho phép của công ty.', 4, 'HIGH',     'TASK', 1,  2,  7, 24.00, 26.00, CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE - INTERVAL '22 days', 8, true,  true,  0, NOW() - INTERVAL '22 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '22 days'),
(14, 1, 3, 'HRMS-14', 'Quy trình xét duyệt Đơn xin nghỉ phép trực tuyến nhiều cấp',         'Xử lý logic tự động gửi thông báo phê duyệt tới quản lý cấp trên khi nhân viên nộp đơn nghỉ phép.',         4, 'HIGH',     'TASK', 2,  2,  8, 16.00, 14.00, CURRENT_DATE - INTERVAL '26 days', CURRENT_DATE - INTERVAL '22 days', 5, true,  false, 0, NOW() - INTERVAL '21 days', NOW() - INTERVAL '26 days', NOW() - INTERVAL '21 days'),
(15, 1, 3, 'HRMS-15', 'Tự động hóa công thức tính bảng lương tháng (Payroll Engine)',        'Cấu hình động công thức tính lương Gross/Net, trừ số ngày nghỉ không phép và cộng tiền trợ cấp.',      4, 'CRITICAL', 'TASK', 3,  2,  7, 24.00, 28.00, CURRENT_DATE - INTERVAL '24 days', CURRENT_DATE - INTERVAL '18 days', 9, true,  true,  0, NOW() - INTERVAL '18 days', NOW() - INTERVAL '24 days', NOW() - INTERVAL '18 days'),
(16, 1, 3, 'HRMS-16', 'Thiết kế REST API Quản lý và gia hạn Hợp đồng lao động',           'Lưu trữ thông tin ngày bắt đầu, ngày kết thúc và cấu hình thông báo email tự động khi hợp đồng sắp hết hạn.', 4, 'MEDIUM',   'TASK', 4,  2,  9, 12.00, 10.00, CURRENT_DATE - INTERVAL '22 days', CURRENT_DATE - INTERVAL '19 days', 3, false, true,  0, NOW() - INTERVAL '19 days', NOW() - INTERVAL '22 days', NOW() - INTERVAL '19 days'),
(17, 1, 3, 'HRMS-17', 'Tính năng đánh giá hiệu suất định kỳ (Performance Review)',         'Tạo mẫu phiếu đánh giá nhân sự 360 độ gồm các tiêu chí KPI, thái độ làm việc và nhận xét từ đồng nghiệp.', 4, 'MEDIUM',   'TASK', 5,  2,  8, 16.00, 15.00, CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '16 days', 5, false, false, 0, NOW() - INTERVAL '16 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '16 days'),
(18, 1, 3, 'HRMS-18', 'Thiết kế màn hình Dashboard tổng quan nhân sự cho Owner',           'Tổng hợp số lượng nhân viên trực tuyến, tổng quỹ lương chi trả trong tháng và tỉ lệ đi làm chuyên cần.', 4, 'HIGH',     'TASK', 6,  2,  8, 20.00, 22.00, CURRENT_DATE - INTERVAL '18 days', CURRENT_DATE - INTERVAL '14 days', 6, false, false, 0, NOW() - INTERVAL '14 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '14 days'),
(19, 1, 3, 'HRMS-19', 'Tự động gửi Email thông báo khi Đơn nghỉ phép được phê duyệt',     'Cấu hình Spring Mail Sender tích hợp Template HTML gửi thư chúc sức khỏe khi được duyệt nghỉ bệnh.',           4, 'LOW',      'TASK', 7,  2,  9,  8.00,  9.00, CURRENT_DATE - INTERVAL '16 days', CURRENT_DATE - INTERVAL '14 days', 2, false, false, 0, NOW() - INTERVAL '14 days', NOW() - INTERVAL '16 days', NOW() - INTERVAL '14 days'),
-- Sprint 4 (ACTIVE) — 8 issues in various stages
(20, 1, 4, 'HRMS-20', 'API Tích hợp Google Drive lưu trữ văn bản hợp đồng an toàn',         'Truy xuất OAuth2, upload file trực tiếp lên thư mục chỉ định và lưu trữ URL Drive vào Database.',                    4, 'HIGH',     'TASK', 1,  2,  7, 16.00, 14.00, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '10 days', 5, true,  true,  0, NOW() - INTERVAL '10 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '10 days'),
(21, 1, 4, 'HRMS-21', 'Xây dựng API Lịch làm việc và Sự kiện nội bộ Tech Corp',       'Tạo thời khóa biểu họp dự án, tổ chức đào tạo nội bộ và tích hợp hiển thị lịch cá nhân.',                    4, 'MEDIUM',   'TASK', 2,  2,  8, 12.00, 10.00, CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE - INTERVAL '8 days',  3, false, false, 0, NOW() - INTERVAL '8 days',  NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days'),
(22, 1, 4, 'HRMS-22', 'Báo cáo hiệu suất làm việc đội ngũ kỹ thuật & Velocity',          'Trích xuất biểu đồ phân tích số lượng story point hoàn tất trong mỗi Sprint của dự án.',             3, 'HIGH',     'TASK', 3,  2,  9, 20.00, 16.00, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '2 days',  6, true,  false, 0, NULL,                 NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days'),
(23, 1, 4, 'HRMS-23', 'Xây dựng phòng chat trực tuyến nội bộ sử dụng WebSocket',     'Cấu hình Spring WebSocket kết nối real-time, cho phép nhân sự trong cùng dự án trao đổi nhanh chóng.', 2, 'HIGH',     'TASK', 4,  2,  7, 24.00,  8.00, CURRENT_DATE - INTERVAL '8 days',  CURRENT_DATE + INTERVAL '2 days', 8, true,  true,  0, NULL,                 NOW() - INTERVAL '8 days',  NOW()),
(24, 1, 4, 'HRMS-24', 'Viết script hỗ trợ đồng bộ hóa database từ Local lên Supabase',  'Xây dựng file script tự động làm sạch và ánh xạ dữ liệu đúng chuẩn PostgreSQL tránh lỗi xung đột sequence.', 2, 'HIGH',     'TASK', 5,  2,  8, 16.00,  4.00, CURRENT_DATE - INTERVAL '6 days',  CURRENT_DATE + INTERVAL '1 day',  4, false, true,  0, NULL,                 NOW() - INTERVAL '6 days',  NOW()),
(25, 1, 4, 'HRMS-25', 'Tối ưu hóa các câu truy vấn Hibernate tải dữ liệu chậm',        'Sử dụng @EntityGraph xử lý dứt điểm lỗi N+1 query huyền thoại khi tải chi tiết các issue có liên kết.', 1, 'MEDIUM',   'BUG',   6,  2,  7, 12.00,  0.00, CURRENT_DATE - INTERVAL '4 days',  CURRENT_DATE + INTERVAL '3 days', 4, false, false, 0, NULL,                 NOW() - INTERVAL '4 days',  NOW()),
(26, 1, 4, 'HRMS-26', 'Thiết kế Nhật ký hoạt động người dùng (Audit Log System)',     'Sử dụng Spring AOP tự động bắt các hành động nhạy cảm (Tạo, sửa, xóa) và ghi nhận vào bảng log hoạt động.', 1, 'LOW',      'TASK', 7,  2, NULL,  8.00,  0.00, CURRENT_DATE - INTERVAL '2 days',  CURRENT_DATE + INTERVAL '5 days', 2, false, false, 0, NULL,                 NOW() - INTERVAL '2 days',  NOW()),
(27, 1, 4, 'HRMS-27', 'Sửa lỗi bảo mật: Session Token hết hạn sớm bất thường',          'Khắc phục việc token JWT bị vô hiệu hóa sau 15 phút, cập nhật thời gian sống token lên 24 giờ cho môi trường dev.', 1, 'CRITICAL', 'BUG',   8,  2, NULL,  4.00,  0.00, CURRENT_DATE - INTERVAL '1 day',  CURRENT_DATE + INTERVAL '1 day', 1, true,  true,  0, NULL,                 NOW() - INTERVAL '1 day',  NOW()),
-- Sprint 5 (PLANNING) — 3 issues
(28, 1, 5, 'HRMS-28', 'Tích hợp Trợ lý Trí tuệ Nhân tạo Gemini AI hỗ trợ Nhân sự', 'Sử dụng mô hình ngôn ngữ lớn để hỗ trợ PM nhận xét đánh giá hiệu suất nhân viên tự động cực kỳ thông minh.', 1, 'HIGH',     'TASK', 1,  2, NULL, 30.00,  0.00, CURRENT_DATE + INTERVAL '1 day',   CURRENT_DATE + INTERVAL '12 days', 9, true,  true,  0, NULL,                 NOW(), NOW()),
(29, 1, 5, 'HRMS-29', 'Tối ưu hóa khả năng hiển thị Kanban Board trên Mobile',      'Cải thiện giao diện responsive bằng CSS Grid giúp kéo thả issue trên màn hình cảm ứng mượt mà.',       1, 'MEDIUM',   'TASK', 2,  2, NULL, 16.00,  0.00, CURRENT_DATE + INTERVAL '3 days',  CURRENT_DATE + INTERVAL '10 days', 4, false, false, 0, NULL,                 NOW(), NOW()),
(30, 1, 5, 'HRMS-30', 'Hỗ trợ đa ngôn ngữ Việt - Anh (i18n) toàn diện',              'Tạo các tập tin lưu trữ ngôn ngữ messages.properties ở Backend và cấu hình thư viện i18next ở Frontend.',  1, 'LOW',      'TASK', 3,  2, NULL, 24.00,  0.00, CURRENT_DATE + INTERVAL '5 days',  CURRENT_DATE + INTERVAL '15 days', 5, false, false, 0, NULL,                 NOW(), NOW()),
-- Backlog (No sprint) — 2 issues
(31, 1, NULL, 'HRMS-31', 'API Trích xuất dữ liệu Bảng lương ra định dạng PDF',        'Sử dụng thư viện JasperReports tạo mẫu bảng lương chuyên nghiệp xuất ra file PDF gửi kèm email.',    1, 'MEDIUM',   'TASK', 1,  2, NULL, 12.00,  0.00, NULL,                   NULL,                    3, false, false, 0, NULL,                 NOW(), NOW()),
(32, 1, NULL, 'HRMS-32', 'Tích hợp Cơ chế bảo mật 2 lớp (Two-Factor Authentication 2FA)', 'Sử dụng Google Authenticator sinh mã xác thực OTP dùng cho các tài khoản Quản trị viên cấp cao.',  1, 'HIGH',     'TASK', 2,  2, NULL, 24.00,  0.00, NULL,                   NULL,                    6, true,  false, 0, NULL,                 NOW(), NOW());

-- ============================================================================
-- 16. TIME LOGS (35 daily work entries across developers for charts)
-- ============================================================================
INSERT INTO time_logs (log_id, issue_id, user_id, company_id, logged_hours, work_date, description, created_at) VALUES
-- Sprint 3 completed issues
(1,  13, 7, 1, 8.00, CURRENT_DATE - INTERVAL '27 days', 'Nghiên cứu tài liệu API GPS Google Maps và phân tích độ sai số thiết bị di động.',                  NOW() - INTERVAL '27 days'),
(2,  13, 7, 1, 8.00, CURRENT_DATE - INTERVAL '26 days', 'Xây dựng API tính khoảng cách dựa trên bán kính tọa độ văn phòng (Formula Haversine).',           NOW() - INTERVAL '26 days'),
(3,  13, 7, 1, 6.00, CURRENT_DATE - INTERVAL '25 days', 'Tích hợp kết nối API lưu lịch sử chấm công vào cơ sở dữ liệu Postgres.',                   NOW() - INTERVAL '25 days'),
(4,  13, 7, 1, 4.00, CURRENT_DATE - INTERVAL '24 days', 'Chạy thử nghiệm chấm công ảo trên máy ảo giả lập và sửa các lỗi sai số kinh độ.', NOW() - INTERVAL '24 days'),
(5,  14, 8, 1, 8.00, CURRENT_DATE - INTERVAL '25 days', 'Thiết kế giao diện bảng biểu nộp đơn xin nghỉ phép bên phía Frontend ReactJS.',         NOW() - INTERVAL '25 days'),
(6,  14, 8, 1, 6.00, CURRENT_DATE - INTERVAL '24 days', 'Kết nối API lấy danh sách loại phép (Annual, sick, Unpaid) và số ngày còn lại.',            NOW() - INTERVAL '24 days'),
(7,  15, 7, 1, 8.00, CURRENT_DATE - INTERVAL '23 days', 'Thiết kế công thức tính thuế thu nhập cá nhân lũy tiến từng phần ở Việt Nam.',           NOW() - INTERVAL '23 days'),
(8,  15, 7, 1, 8.00, CURRENT_DATE - INTERVAL '22 days', 'Thiết lập cách tính tiền bảo hiểm xã hội (8%) và bảo hiểm y tế (1.5%) bắt buộc.',           NOW() - INTERVAL '22 days'),
(9,  15, 7, 1, 8.00, CURRENT_DATE - INTERVAL '21 days', 'Tích hợp hệ số lương nhân sự, phụ cấp và số ngày đi làm thực tế từ module chấm công.', NOW() - INTERVAL '21 days'),
(10, 15, 7, 1, 4.00, CURRENT_DATE - INTERVAL '20 days', 'Sửa lỗi làm tròn số thập phân trong tính lương gây lệch vài trăm đồng lẻ.',              NOW() - INTERVAL '20 days'),
(11, 16, 9, 1, 8.00, CURRENT_DATE - INTERVAL '21 days', 'Thiết kế các API lưu trữ hợp đồng lao động mới, cấu hình các thuộc tính file đính kèm.',         NOW() - INTERVAL '21 days'),
(12, 16, 9, 1, 2.00, CURRENT_DATE - INTERVAL '20 days', 'Viết lớp xử lý định kỳ kiểm tra hạn hợp đồng để chuẩn bị gửi cảnh báo email.', NOW() - INTERVAL '20 days'),
(13, 17, 8, 1, 8.00, CURRENT_DATE - INTERVAL '19 days', 'Xây dựng giao diện mẫu phiếu tự đánh giá chất lượng làm việc dành cho nhân viên.',        NOW() - INTERVAL '19 days'),
(14, 17, 8, 1, 7.00, CURRENT_DATE - INTERVAL '18 days', 'Xây dựng form nhập điểm đánh giá KPI từ PM dành cho thành viên dự án.',              NOW() - INTERVAL '18 days'),
(15, 18, 8, 1, 8.00, CURRENT_DATE - INTERVAL '17 days', 'Thiết lập biểu đồ cột Recharts thống kê tỉ lệ đi làm muộn của công ty.',          NOW() - INTERVAL '17 days'),
(16, 18, 8, 1, 8.00, CURRENT_DATE - INTERVAL '16 days', 'Xây dựng widget thống kê nhanh số lượng nhân viên đang hoạt động trong ngày.',      NOW() - INTERVAL '16 days'),
(17, 18, 8, 1, 6.00, CURRENT_DATE - INTERVAL '15 days', 'Kết nối dữ liệu thực tế từ API tổng hợp quỹ lương lên biểu đồ đường Dashboard.',  NOW() - INTERVAL '15 days'),
(18, 19, 9, 1, 8.00, CURRENT_DATE - INTERVAL '15 days', 'Viết HTML Template email định dạng responsive hiển thị đẹp mắt trên điện thoại.',        NOW() - INTERVAL '15 days'),
(19, 19, 9, 1, 1.00, CURRENT_DATE - INTERVAL '14 days', 'Cấu hình hoàn tất tài khoản SMTP Gmail gửi thư phê duyệt đơn nghỉ phép tự động.', NOW() - INTERVAL '14 days'),
-- Sprint 4 active issues
(20, 20, 7, 1, 8.00, CURRENT_DATE - INTERVAL '13 days', 'Đăng ký tài khoản Google Cloud Platform, kích hoạt API Drive và lấy Client Secret.',         NOW() - INTERVAL '13 days'),
(21, 20, 7, 1, 6.00, CURRENT_DATE - INTERVAL '12 days', 'Viết dịch vụ kết nối Google OAuth2, xử lý tự động làm mới mã Token khi hết hạn.',     NOW() - INTERVAL '12 days'),
(22, 20, 7, 1, 8.00, CURRENT_DATE - INTERVAL '11 days', 'Phát triển hàm tải tệp lên Drive, tạo thư mục con tự động theo mã Nhân viên.', NOW() - INTERVAL '11 days'),
(23, 20, 7, 1, 2.00, CURRENT_DATE - INTERVAL '10 days', 'Viết test case kiểm thử tải lên file PDF dung lượng lớn lên tới 50MB.',           NOW() - INTERVAL '10 days'),
(24, 21, 8, 1, 6.00, CURRENT_DATE - INTERVAL '11 days', 'Thiết kế giao diện lịch làm việc trực quan cho phép xem theo tháng/tuần/ngày.',  NOW() - INTERVAL '11 days'),
(25, 21, 8, 1, 4.00, CURRENT_DATE - INTERVAL '10 days', 'API lưu sự kiện họp dự án, tự động chặn trùng lịch của các PM khác nhau.', NOW() - INTERVAL '10 days'),
(26, 22, 9, 1, 8.00, CURRENT_DATE - INTERVAL '9 days',  'Viết hàm tổng hợp số lượng story point hoàn tất trong mỗi Sprint của dự án.',  NOW() - INTERVAL '9 days'),
(27, 22, 9, 1, 8.00, CURRENT_DATE - INTERVAL '8 days',  'Phát triển dịch vụ trích xuất số liệu tổng hợp biểu đồ cột năng suất làm việc.', NOW() - INTERVAL '8 days'),
(28, 23, 7, 1, 8.00, CURRENT_DATE - INTERVAL '7 days',  'Cấu hình thư viện SocketJS ở phía client React, kết nối thử nghiệm WebSocket Server.', NOW() - INTERVAL '7 days'),
(29, 23, 7, 1, 8.00, CURRENT_DATE - INTERVAL '6 days',  'Xây dựng cấu trúc kênh chat chung cho từng dự án, phát các tin nhắn tới người dùng.', NOW() - INTERVAL '6 days'),
(30, 23, 7, 1, 4.00, CURRENT_DATE - INTERVAL '5 days',  'Xử lý hiển thị trạng thái đang nhập chữ (...) và lịch sử 50 tin nhắn cũ nhất.', NOW() - INTERVAL '5 days'),
(31, 24, 8, 1, 8.00, CURRENT_DATE - INTERVAL '5 days',  'Nghiên cứu cú pháp PostgreSQL, lược bỏ các câu lệnh T-SQL của SQL Server.',    NOW() - INTERVAL '5 days'),
(32, 24, 8, 1, 8.00, CURRENT_DATE - INTERVAL '4 days',  'Thiết kế câu lệnh setval tự động thiết lập lại chỉ số sequence sau khi import.',   NOW() - INTERVAL '4 days'),
(33, 24, 8, 1, 4.00, CURRENT_DATE - INTERVAL '3 days',  'Viết script Python tự động thực thi nạp dữ liệu seed từ xa kết nối Supabase.', NOW() - INTERVAL '3 days'),
(34, 24, 8, 1, 4.00, CURRENT_DATE - INTERVAL '2 days',  'Kiểm thử toàn diện kịch bản đồng bộ hóa trên môi trường docker local.', NOW() - INTERVAL '2 days'),
(35, 22, 9, 1, 8.00, CURRENT_DATE - INTERVAL '1 day',   'Tối ưu hóa giao diện Recharts hiển thị trơn tru các đường dốc Burndown.', NOW() - INTERVAL '1 day');

-- ============================================================================
-- 17. ISSUE COMMENTS (Collaboration Thread)
-- ============================================================================
INSERT INTO issue_comments (id, issue_id, author_id, content, created_at, updated_at) VALUES
(1, 20, 6, 'Hoàng Quốc Bảo ơi, tiến độ tích hợp Drive sao rồi? Tôi cần xem file log upload.',        NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days'),
(2, 20, 7, 'Dạ em đã tích hợp thành công, xử lý xong phần OAuth2 tự refresh token. Em đã đẩy code lên branch rồi anh, anh test giúp em nhé.', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
(3, 23, 6, 'Vũ Minh Trí nhớ lưu ý cấu hình thread pool cho WebSocket server nha, để phòng ngừa số lượng kết nối lớn đồng thời gây ngắt quãng.', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
(4, 23, 7, 'Vâng anh Trí, em đã cấu hình thread pool size tối thiểu là 10, tối đa là 100 kết nối đồng thời. Đã test chạy thử 50 user ảo thấy rất ổn định.', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days');

-- ============================================================================
-- 18. ISSUE ACTIVITIES (Event Stream History)
-- ============================================================================
INSERT INTO issue_activities (id, issue_id, user_id, activity_type, description, created_at) VALUES
(1, 20, 6, 'CREATED',       'Khởi tạo công việc tích hợp Drive lưu trữ.',                   NOW() - INTERVAL '14 days'),
(2, 20, 6, 'ASSIGNED',      'Giao công việc này cho Hoàng Quốc Bảo xử lý.',                   NOW() - INTERVAL '14 days'),
(3, 20, 7, 'STATUS_CHANGED','Chuyển trạng thái từ In Progress sang Review.',                 NOW() - INTERVAL '11 days'),
(4, 20, 6, 'STATUS_CHANGED','Đã kiểm thử đạt yêu cầu. Chuyển trạng thái sang Done.',   NOW() - INTERVAL '10 days'),
(5, 23, 6, 'CREATED',       'Tạo công việc xây dựng WebSocket chat room.',                   NOW() - INTERVAL '8 days'),
(6, 23, 6, 'ASSIGNED',      'Giao công việc WebSocket cho Hoàng Quốc Bảo xử lý.',               NOW() - INTERVAL '8 days'),
(7, 23, 7, 'STATUS_CHANGED','Bắt đầu xử lý. Chuyển trạng thái sang In Progress.',           NOW() - INTERVAL '8 days');

-- ============================================================================


-- ============================================================================
-- 20. RESOURCE ALLOCATIONS (per-employee project assignments)
-- ============================================================================
INSERT INTO resource_allocations (allocation_id, employee_id, project_id, start_date, end_date, allocation, note, created_at, updated_at) VALUES
-- HRMS project (project_id = 1) - 3-month sprint cycle
(1,  6,  1, CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '2 months',  80, 'PM chính dự án HRMS, điều phối toàn bộ team và quản lý sprint.',               NOW() - INTERVAL '3 months', NOW()),
(2,  7,  1, CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '2 months', 100, 'Tech lead backend, phụ trách kiến trúc Spring Boot và các API core.',           NOW() - INTERVAL '3 months', NOW()),
(3,  8,  1, CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '2 months', 100, 'Senior frontend, xây dựng giao diện ReactJS và kết nối API.',                    NOW() - INTERVAL '3 months', NOW()),
(4,  9,  1, CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '2 months', 100, 'Backend developer, phụ trách module chấm công GPS và tính lương.',           NOW() - INTERVAL '3 months', NOW()),
(5, 11,  1, CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '2 months',  50, 'QA automation, viết test case tự động và kiểm thử trước release.',             NOW() - INTERVAL '3 months', NOW()),
-- ECOM project (project_id = 2) - newer allocation
(6,  7,  2, CURRENT_DATE - INTERVAL '1 month',  CURRENT_DATE + INTERVAL '4 months',  50, 'Backend architect kiêm dự án ECOM, hỗ trợ thiết kế database đồng bộ hóa.', NOW() - INTERVAL '1 month',  NOW()),
(7, 10,  2, CURRENT_DATE - INTERVAL '1 month',  CURRENT_DATE + INTERVAL '4 months', 100, 'React Native developer chính, xây dựng ứng dụng mua sắm di động.',             NOW() - INTERVAL '1 month',  NOW()),
-- Multi-project overlap
(8,  6,  2, CURRENT_DATE - INTERVAL '1 month',  CURRENT_DATE + INTERVAL '4 months',  50, 'PO kiêm dự án ECOM, quản lý backlog và giao tiếp với khách hàng.',              NOW() - INTERVAL '1 month',  NOW());

-- ============================================================================
-- 21. PROJECT GOALS (monthly measurable objectives per project)
-- ============================================================================
INSERT INTO project_goals (goal_id, project_id, title, month_value, year_value, is_completed, created_at, updated_at) VALUES
-- HRMS Q1 goals
(1,  1, 'Hoàn thành module chấm công GPS và API tích hợp bản đồ Google Maps',    4, 2026, true,  NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),
(2,  1, 'Triển khai hệ thống đơn nghỉ phép trực tuyến với quy trình phê duyệt 2 cấp', 4, 2026, true,  NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 month'),
(3,  1, 'Xây dựng Payroll Engine tự động tính lương Gross/Net cho 50+ nhân viên',  5, 2026, true,  NOW() - INTERVAL '1 month',  NOW() - INTERVAL '15 days'),
(4,  1, 'Phát hành Dashboard HR tổng quan cho Owner với biểu đồ Recharts',          5, 2026, true,  NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days'),
-- HRMS active goals
(5,  1, 'Hoàn tất Sprint 4: Google Drive, Audit Log, WebSocket Chat',                6, 2026, false, NOW(),                   NOW()),
(6,  1, 'Tích hợp Gemini AI hỗ trợ đánh giá hiệu suất tự động',                   7, 2026, false, NOW(),                   NOW()),
-- ECOM goals
(7,  2, 'Thiết kế kiến trúc database và API core cho E-Commerce Platform',           5, 2026, true,  NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
(8,  2, 'Tích hợp cổng thanh toán VNPay/Momo và kiểm thử giao dịch',               6, 2026, false, NOW(),                   NOW()),
(9,  2, 'Xây dựng giao diện trang sản phẩm và checkout flow hoàn chỉnh',           7, 2026, false, NOW(),                   NOW());

-- ============================================================================
-- 22. NOTIFICATIONS (tenant-scoped, diverse realistic scenarios)
-- ============================================================================
INSERT INTO notifications (notification_id, user_id, type, title, content, link, is_read, created_at, priority, metadata) VALUES
-- Leave request notifications
(1,  3, 'HR_LEAVE_REQUEST_CREATED', 'Đơn nghỉ phép cần duyệt', 'Lê Thị Tuyết Mai đã nộp đơn nghỉ phép năm từ ngày ... đến ngày ... (3 ngày).',      '/hr/leave-requests',    false, NOW() - INTERVAL '5 days',  'NORMAL', NULL),
(2,  3, 'HR_LEAVE_APPROVED',         'Đơn nghỉ phép đã được duyệt', 'Đơn nghỉ phép của Hoàng Quốc Bảo đã được phê duyệt. Nghỉ từ ngày ... đến ngày ...', '/hr/leave-requests',    true,  NOW() - INTERVAL '13 days', 'NORMAL', NULL),
(3,  3, 'HR_LEAVE_REJECTED',         'Đơn nghỉ phép bị từ chối', 'Đơn nghỉ phép của Phan Huy Khánh đã bị từ chối. Lý do: dự án đang bận sprint cuối.', '/hr/leave-requests',    true,  NOW() - INTERVAL '7 days',  'NORMAL', NULL),
-- Task assignments
(4,  7, 'TASK_ASSIGNED',             'Công việc mới được giao',    'Bạn được giao việc: HRMS-27 - Sửa lỗi bảo mật Session Token JWT hết hạn sớm.',  '/projects/1/board',      false, NOW() - INTERVAL '1 day',   'HIGH',   '{"issue_id": 27, "project_id": 1}'),
(5,  8, 'TASK_ASSIGNED',             'Công việc mới được giao',    'Bạn được giao việc: HRMS-26 - Thiết kế Nhật ký hoạt động người dùng (Audit Log).', '/projects/1/board',      false, NOW() - INTERVAL '2 days',  'NORMAL', '{"issue_id": 26, "project_id": 1}'),
-- Project assignments
(6,  7, 'PROJECT_MEMBER_ADDED',     'Được thêm vào dự án mới',   'Bạn đã được thêm vào dự án "E-Commerce Platform" với vai trò Backend Architect.',  '/projects/2/board',      true,  NOW() - INTERVAL '1 month',  'NORMAL', '{"project_id": 2}'),
(7, 10, 'PROJECT_MEMBER_ADDED',     'Được thêm vào dự án mới',   'Bạn đã được thêm vào dự án "E-Commerce Platform" với vai trò React Native Dev.',  '/projects/2/board',      true,  NOW() - INTERVAL '1 month',  'NORMAL', '{"project_id": 2}'),
-- System alerts
(8,  6, 'PROJECT_STATUS_CHANGED',    'Sprint 4 chuyển sang ACTIVE', 'Sprint 4 - Integration đã được kích hoạt. Deadline: ... Mục tiêu: Audit Log, WebSocket, Analytics.', '/projects/1/sprints',  false, NOW() - INTERVAL '14 days', 'HIGH',   '{"sprint_id": 4}'),
(9,  6, 'PROJECT_STATUS_CHANGED',    'Sprint 5 đã được lên kế hoạch', 'Sprint 5 - Polish đã được tạo. Bắt đầu từ ngày mai. Dự kiến hoàn thành AI Assistant và i18n.', '/projects/1/sprints', false, NOW(),                   'NORMAL', '{"sprint_id": 5}'),
-- Salary notifications
(10, 2, 'HR_SALARY_CREATED',         'Bảng lương tháng 4/2026 đã tạo', 'Bảng lương tháng 4/2026 cho Tech Corp đã được tạo. Tổng chi: 250,000,000 VNĐ cho 11 nhân viên.', '/hr/salary',         false, NOW() - INTERVAL '5 days',  'HIGH',   '{"month": 4, "year": 2026}'),
(11, 6, 'HR_SALARY_INCREASE_PROPOSAL', 'Đề xuất tăng lương cho dev_a1', 'Hoàng Quốc Bảo đạt điểm EXCELLENT trong Q1-2026. Đề xuất tăng lương từ 20M lên 25M VNĐ.', '/hr/salary-proposals', false, NOW() - INTERVAL '3 days', 'HIGH',   '{"proposal_id": 1}'),
-- Contract expiry
(12, 3, 'HR_CONTRACT_EXPIRING',       'Hợp đồng sắp hết hạn',      'Hợp đồng lao động của Lê Thị Tuyết Mai sẽ hết hạn trong 30 ngày (ngày ...). Cần gia hạn.', '/hr/employees/3', false, NOW() - INTERVAL '10 days', 'HIGH',  '{"employee_id": 3}'),
-- Sprint reminders
(13, 7, 'TASK_DUE_SOON',              'Công việc sắp hết hạn',      'HRMS-23 - Xây dựng WebSocket Chat sẽ hết hạn vào ngày mai. Tiến độ: In Progress.', '/projects/1/board',      false, NOW(),                   'URGENT', '{"issue_id": 23}'),
(14, 9, 'TASK_DUE_SOON',              'Công việc sắp hết hạn',      'HRMS-27 - Sửa lỗi bảo mật JWT Token sẽ hết hạn vào ngày mai. Tiến độ: To Do.', '/projects/1/board',       false, NOW(),                   'URGENT', '{"issue_id": 27}'),
-- System alerts
(15, 2, 'SYSTEM_ALERT',               'Gemini AI Assistant đã sẵn sàng', 'Trợ lý AI đã được tích hợp vào hệ thống. PM có thể sử dụng để phân tích hiệu suất sprint.', '/smart-assistant',     true,  NOW() - INTERVAL '7 days',  'NORMAL', NULL),
(16, 6, 'SYSTEM_ALERT',               'Báo cáo Velocity Sprint 3',  'Sprint 3 đã hoàn thành. Velocity: 48/42 story points (114%). Team đã vượt mục tiêu.', '/projects/1/analytics', true,  NOW() - INTERVAL '14 days', 'NORMAL', '{"sprint_id": 3}');

-- ============================================================================
-- 23. CALENDAR EVENTS (tenant-scoped meetings, deadlines, holidays)
-- ============================================================================
INSERT INTO calendar_events (event_id, all_day, color_code, created_at, description, end_time, event_type, location, meeting_link, recurrence_rule, start_time, title, updated_at, company_id, created_by, issue_id, project_id, is_recurring) VALUES
-- Sprint ceremonies
(1,  false, '#4BADE8', NOW() - INTERVAL '56 days', 'Sprint Planning lần đầu tiên, thiết lập khung cấu trúc dự án HRMS.',                CURRENT_TIMESTAMP - INTERVAL '56 days' + INTERVAL '3 hours', 'MEETING', 'Phòng họp A - Tầng 12 Bitexco', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '56 days', 'Sprint 1 Planning',                         NOW() - INTERVAL '56 days', 1, 2, NULL, 1, false),
(2,  false, '#4BADE8', NOW() - INTERVAL '42 days', 'Sprint Review & Retrospective. Trình diễn kiến trúc ERD và Spring Security.',       CURRENT_TIMESTAMP - INTERVAL '42 days' + INTERVAL '2 hours', 'MEETING', 'Phòng họp B - Tầng 12 Bitexco', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '42 days', 'Sprint 1 Review & Retro',                  NOW() - INTERVAL '42 days', 1, 2, NULL, 1, false),
(3,  false, '#4BADE8', NOW() - INTERVAL '28 days', 'Sprint Review Sprint 3. Trình diễn module GPS, Payroll Engine và Dashboard HR.',    CURRENT_TIMESTAMP - INTERVAL '28 days' + INTERVAL '2 hours', 'MEETING', 'Phòng họp A - Tầng 12 Bitexco', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '28 days', 'Sprint 3 Review - HR Features Complete',   NOW() - INTERVAL '28 days', 1, 6, NULL, 1, false),
(4,  false, '#4BADE8', NOW() - INTERVAL '14 days', 'Sprint 4 Planning. Mục tiêu: Google Drive, WebSocket Chat, Analytics Dashboard.',  CURRENT_TIMESTAMP - INTERVAL '14 days' + INTERVAL '3 hours', 'MEETING', 'Phòng họp A - Tầng 12 Bitexco', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '14 days', 'Sprint 4 Planning - Integration',            NOW() - INTERVAL '14 days', 1, 6, NULL, 1, false),
-- Stand-ups (recurring daily during active sprint)
(5,  false, '#48BB78', NOW() - INTERVAL '13 days', 'Daily stand-up team HRMS. Cập nhật tiến độ WebSocket, Google Drive integration.',   CURRENT_TIMESTAMP - INTERVAL '13 days' + INTERVAL '30 minutes', 'MEETING', 'Microsoft Teams', 'https://teams.microsoft.com/meet/hr-sprint4-daily', NULL, CURRENT_TIMESTAMP - INTERVAL '13 days', 'Daily Stand-up HRMS Sprint 4',              NOW() - INTERVAL '13 days', 1, 6, NULL, 1, true),
(6,  false, '#48BB78', NOW() - INTERVAL '6 days',  'Daily stand-up. Tập trung vào task HRMS-23 (WebSocket) và HRMS-24 (DB Sync).',     CURRENT_TIMESTAMP - INTERVAL '6 days' + INTERVAL '30 minutes', 'MEETING', 'Microsoft Teams', 'https://teams.microsoft.com/meet/hr-sprint4-daily', NULL, CURRENT_TIMESTAMP - INTERVAL '6 days', 'Daily Stand-up HRMS Sprint 4',              NOW() - INTERVAL '6 days', 1, 6, NULL, 1, true),
(7,  false, '#48BB78', NOW(),                        'Daily stand-up cuối tuần. Review sprint progress và lên kế hoạch Sprint 5.',          CURRENT_TIMESTAMP + INTERVAL '30 minutes', 'MEETING', 'Microsoft Teams', 'https://teams.microsoft.com/meet/hr-sprint4-daily', NULL, CURRENT_TIMESTAMP, 'Daily Stand-up HRMS Sprint 4',              NOW(), 1, 6, NULL, 1, true),
-- Deadlines
(8,  true,  '#F6AD55', NOW() - INTERVAL '7 days',  'Deadline hoàn thành tất cả issue trong Sprint 4 trước khi bắt đầu Sprint 5.',     CURRENT_TIMESTAMP - INTERVAL '1 days', 'DEADLINE', NULL, NULL, NULL, CURRENT_TIMESTAMP + INTERVAL '1 day', 'Sprint 4 Hard Deadline',                     NOW() - INTERVAL '7 days', 1, 2, NULL, 1, false),
(9,  true,  '#F6AD55', NOW() + INTERVAL '1 day',   'HRMS-23 WebSocket Chat và HRMS-20 Google Drive cần hoàn thành trước hạn.',         CURRENT_TIMESTAMP + INTERVAL '1 day', 'DEADLINE', NULL, NULL, NULL, CURRENT_TIMESTAMP + INTERVAL '1 day', 'Sprint 4 Issue Deadline (HRMS-23)',          NOW() - INTERVAL '3 days', 1, 6, 23, 1, false),
(10, true,  '#F6AD55', NOW() + INTERVAL '2 months', 'Dự kiến hoàn thành toàn bộ dự án HRMS và bàn giao cho khách hàng Tech Corp.',      CURRENT_TIMESTAMP + INTERVAL '2 months', 'DEADLINE', NULL, NULL, NULL, CURRENT_TIMESTAMP + INTERVAL '2 months', 'HRMS Project Delivery Deadline',              NOW() - INTERVAL '1 month', 1, 2, NULL, 1, false),
-- ECOM events
(11, false, '#4BADE8', NOW() - INTERVAL '20 days', 'Kickoff E-Commerce Platform. Định hướng kiến trúc, phân chia module công việc.',    CURRENT_TIMESTAMP - INTERVAL '20 days' + INTERVAL '2 hours', 'MEETING', 'Phòng họp B - Tầng 12 Bitexco', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '20 days', 'ECOM Kickoff Meeting',                        NOW() - INTERVAL '20 days', 1, 6, NULL, 2, false),
-- Company events
(12, true,  '#7c3aed', NOW() + INTERVAL '20 days', 'Nghỉ lễ Giỗ Tổ Hùng Vương 2026. Toàn công ty nghỉ 1 ngày.',                        CURRENT_TIMESTAMP + INTERVAL '20 days', 'HOLIDAY', NULL, NULL, NULL, CURRENT_TIMESTAMP + INTERVAL '20 days', 'Giỗ Tổ Hùng Vương 2026',                     NOW(), 1, 2, NULL, NULL, false),
(13, true,  '#7c3aed', NOW() + INTERVAL '30 days', 'Ngày Thống nhất đất nước 30/4. Toàn công ty nghỉ lễ.',                              CURRENT_TIMESTAMP + INTERVAL '30 days', 'HOLIDAY', NULL, NULL, NULL, CURRENT_TIMESTAMP + INTERVAL '30 days', 'Ngày Thống Nhất 30/4',                       NOW(), 1, 2, NULL, NULL, false);

-- ============================================================================
-- 24. SALARY PROPOSALS (HR-internal raise requests)
-- ============================================================================
INSERT INTO salary_proposals (proposal_id, employee_id, company_id, project_id, proposed_salary, current_salary, reason, status, reviewed_by, review_date, created_at, updated_at) VALUES
(1, 7, 1, 1, 25000000.00, 20000000.00, 'Hoàng Quốc Bảo đạt rating EXCELLENT trong Q1-2026, hoàn thành xuất sắc Payroll Engine và WebSocket Chat. Khuyến nghị tăng 25%.', 'PENDING', NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
(2, 8, 1, 1, 24000000.00, 22000000.00, 'Nguyễn Song Hào đạt EXCELLENT Q1-2026, thiết kế Dashboard HR xuất sắc và hỗ trợ backend tốt. Khuyến nghị tăng 9%.',      'PENDING', NULL, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(3, 3, 1, 1, 30000000.00, 28000000.00, 'Lê Thị Tuyết Mai có 2 năm kinh nghiệm, attitude score cao nhất team (9.0), gắn bó lâu dài. Khuyến nghị tăng 7%.',     'APPROVED', 2, CURRENT_DATE - INTERVAL '15 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days');

-- ============================================================================
-- 25. EVENT ATTENDEES (RSVP links for calendar meetings)
-- ============================================================================
INSERT INTO event_attendees (id, event_id, user_id, response_status) VALUES
-- Sprint 1 Planning (event 1)
(1, 1, 2, 'ACCEPTED'),  -- Owner
(2, 1, 6, 'ACCEPTED'),  -- PM
(3, 1, 7, 'ACCEPTED'),  -- dev_a1
(4, 1, 8, 'ACCEPTED'),  -- dev_a2
(5, 1, 9, 'ACCEPTED'),  -- dev_a3
(6, 1, 11, 'ACCEPTED'), -- QA
-- Sprint 3 Review (event 3)
(7, 3, 2, 'ACCEPTED'),
(8, 3, 6, 'ACCEPTED'),
(9, 3, 7, 'ACCEPTED'),
(10, 3, 8, 'ACCEPTED'),
(11, 3, 9, 'ACCEPTED'),
(12, 3, 11, 'DECLINED'), -- QA declined (on leave)
-- Sprint 4 Planning (event 4)
(13, 4, 2, 'ACCEPTED'),
(14, 4, 6, 'ACCEPTED'),
(15, 4, 7, 'ACCEPTED'),
(16, 4, 8, 'ACCEPTED'),
(17, 4, 9, 'ACCEPTED'),
(18, 4, 11, 'ACCEPTED'),
-- ECOM Kickoff (event 11)
(19, 11, 2, 'ACCEPTED'),
(20, 11, 6, 'ACCEPTED'),
(21, 11, 7, 'TENTATIVE'),
(22, 11, 10, 'ACCEPTED');

-- ============================================================================
-- 26. FILES (uploaded documents linked to projects and issues)
-- ============================================================================
INSERT INTO files (file_id, file_name, google_drive_file_id, file_size, content_type, project_id, issue_id, uploaded_by, company_id, folder, created_at, updated_at) VALUES
-- HRMS project files
(1, 'HRMS_ERD_Database_Schema_v3.pdf',  '1A2B3C4D5E6F7G8H9I0J_KLM', 2457600, 'application/pdf',  1, NULL, 2, 1, 'documents', NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),
(2, 'TechCorp_HR_Contract_Template.docx', '2B3C4D5E6F7G8H9I0J1A_KMN', 512000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1, NULL, 2, 1, 'contracts', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),
(3, 'Sprint3_Burndown_Chart.png',         '3C4D5E6F7G8H9I0J1A2B_LMO', 204800, 'image/png',          1, 18,  8, 1, 'reports', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
(4, 'Sprint4_Analytics_Dashboard.png',    '4D5E6F7G8H9I0J1A2B3C_MNP', 307200, 'image/png',          1, 22,  8, 1, 'reports', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
-- ECOM project files
(5, 'ECOM_Architecture_Proposal_v1.pdf', '5E6F7G8H9I0J1A2B3C4D_NOP', 1843200, 'application/pdf',  2, NULL, 6, 1, 'documents', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
(6, 'ECOM_UI_Mockup_Figma.pdf',           '6F7G8H9I0J1A2B3C4D5E_OPQ', 8192000, 'application/pdf', 2, NULL, 6, 1, 'designs', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days');

-- ============================================================================
-- 27. ISSUE CUSTOM FIELDS (project-specific Jira-like fields for HRMS & ECOM)
-- ============================================================================
INSERT INTO issue_custom_fields (field_id, project_id, company_id, name, description, field_type, options, is_required, display_order, is_active, default_value, created_at, updated_at) VALUES
-- HRMS custom fields
(1,  1, 1, 'Business Value',     'Giá trị kinh doanh của issue tính theo thang 1-10',                     'NUMBER',    NULL,              false, 1, true,  '5',    NOW() - INTERVAL '3 months', NOW()),
(2,  1, 1, 'Department',         'Phòng ban liên quan trực tiếp đến issue',                              'SELECT',    '["Engineering","HR","Finance","Marketing","Operations"]', true,  2, true,  NULL,   NOW() - INTERVAL '3 months', NOW()),
(3,  1, 1, 'Sprint Goal',       'Issue có liên quan đến mục tiêu sprint không',                           'CHECKBOX',  NULL,              false, 3, true,  'false', NOW() - INTERVAL '3 months', NOW()),
(4,  1, 1, 'Related Module',     'Module chức năng trong hệ thống HRMS mà issue thuộc về',              'SELECT',    '["Auth","Employee","Payroll","Attendance","Leave","Review","Project","Dashboard","Storage","Notification"]', true, 4, true, 'Employee', NOW() - INTERVAL '2 months', NOW()),
(5,  1, 1, 'Environment',        'Môi trường áp dụng khi issue liên quan đến nhiều môi trường',         'MULTI_SELECT', '["Development","Staging","Production"]', false, 5, true, NULL, NOW() - INTERVAL '2 months', NOW()),
(6,  1, 1, 'Code Review Link',   'Đường dẫn PR/MR trên GitHub hoặc GitLab sau khi hoàn thành',         'URL',       NULL,              false, 6, false, NULL,   NOW() - INTERVAL '2 months', NOW()),
-- ECOM custom fields
(7,  2, 1, 'Revenue Impact',    'Tác động ước tính đến doanh thu (VNĐ)',                               'NUMBER',    NULL,              false, 1, true,  '0',    NOW() - INTERVAL '1 month', NOW()),
(8,  2, 1, 'Payment Gateway',    'Cổng thanh toán liên quan nếu issue về thanh toán',                  'SELECT',    '["VNPay","Momo","ZaloPay","Banking","COD","PayPal"]', false, 2, true, NULL, NOW() - INTERVAL '1 month', NOW()),
(9,  2, 1, 'Product Category',   'Danh mục sản phẩm liên quan trong E-Commerce',                        'SELECT',    '["Electronics","Fashion","Food","Home","Beauty","Sports","Books","Toys"]', false, 3, true, NULL, NOW() - INTERVAL '1 month', NOW());

-- ============================================================================
-- 28. ISSUE CUSTOM FIELD VALUES (populate fields for selected issues)
-- ============================================================================
INSERT INTO issue_custom_field_values (value_id, issue_id, field_id, string_value, number_value, date_value, datetime_value, boolean_value, user_value, created_at, updated_at) VALUES
-- HRMS-3 (Spring Security JWT) - CRITICAL issue
(1,  3, 1, NULL, 10.0, NULL, NULL, NULL, NULL, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
(2,  3, 2, 'Engineering', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
(3,  3, 3, NULL, NULL, NULL, NULL, true, NULL, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
(4,  3, 4, 'Auth', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
(5,  3, 5, '["Development","Staging","Production"]', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
-- HRMS-13 (GPS Attendance)
(6,  13, 1, NULL, 8.0, NULL, NULL, NULL, NULL, NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),
(7,  13, 2, 'HR', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),
(8,  13, 3, NULL, NULL, NULL, NULL, true, NULL, NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),
(9,  13, 4, 'Attendance', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),
-- HRMS-15 (Payroll Engine)
(10, 15, 1, NULL, 9.0, NULL, NULL, NULL, NULL, NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
(11, 15, 2, 'HR', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
(12, 15, 3, NULL, NULL, NULL, NULL, true, NULL, NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
(13, 15, 4, 'Payroll', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
-- HRMS-20 (Google Drive)
(14, 20, 1, NULL, 7.0, NULL, NULL, NULL, NULL, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
(15, 20, 2, 'Engineering', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
(16, 20, 4, 'Storage', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
-- HRMS-23 (WebSocket Chat)
(17, 23, 1, NULL, 8.0, NULL, NULL, NULL, NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
(18, 23, 2, 'Engineering', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
(19, 23, 4, 'Notification', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
-- HRMS-27 (JWT Security Bug)
(20, 27, 1, NULL, 10.0, NULL, NULL, NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(21, 27, 2, 'Engineering', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(22, 27, 3, NULL, NULL, NULL, NULL, true, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(23, 27, 4, 'Auth', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(24, 27, 5, '["Production"]', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
-- ECOM issue (integration)
(25, 7,  7, NULL, 8.0, NULL, NULL, NULL, NULL, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
(26, 7,  8, '["VNPay","Momo"]', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
(27, 7,  9, '["Electronics"]', NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days');

-- ============================================================================
-- 29. ISSUE DEPENDENCIES (Gantt-style finish-to-start chains for HRMS sprint)
-- ============================================================================
INSERT INTO issue_dependencies (dependency_id, predecessor_id, successor_id, dependency_type, lag_days, created_at) VALUES
-- Sprint 1 dependency chain: ERD must complete before security
(1, 2, 3, 'FINISH_TO_START', 0, NOW() - INTERVAL '50 days'),
-- Sprint 2 chain: Auth API before Kanban, before settings, before multi-tenant
(2, 4, 7,  'FINISH_TO_START', 0, NOW() - INTERVAL '40 days'),
(3, 7, 9,  'FINISH_TO_START', 0, NOW() - INTERVAL '35 days'),
(4, 9, 11, 'FINISH_TO_START', 0, NOW() - INTERVAL '30 days'),
-- Sprint 3 chain: Leave API before Payroll
(5, 14, 15, 'FINISH_TO_START', 0, NOW() - INTERVAL '20 days'),
-- Sprint 4 chain: Drive before Chat (need file sharing)
(6, 20, 23, 'FINISH_TO_START', 0, NOW() - INTERVAL '7 days'),
-- Backlog dependencies
(7, 31, 32, 'FINISH_TO_START', 0, NOW());

-- ============================================================================
-- 30. LOGIN ATTEMPTS (authentication history for rate limiting demo)
-- ============================================================================
INSERT INTO login_attempts (id, username, ip_address, success, failure_reason, attempted_at) VALUES
(1,  'owner_a',   '192.168.1.100', true,  NULL,                                            NOW() - INTERVAL '7 days'),
(2,  'pm_a',      '192.168.1.101', true,  NULL,                                            NOW() - INTERVAL '6 days'),
(3,  'dev_a1',    '192.168.1.102', true,  NULL,                                            NOW() - INTERVAL '5 days'),
(4,  'dev_a2',    '192.168.1.103', true,  NULL,                                            NOW() - INTERVAL '4 days'),
(5,  'dev_a3',    '192.168.1.104', true,  NULL,                                            NOW() - INTERVAL '3 days'),
(6,  'hr_a',      '192.168.1.105', true,  NULL,                                            NOW() - INTERVAL '2 days'),
(7,  'owner_a',   '192.168.1.100', true,  NULL,                                            NOW() - INTERVAL '1 day'),
(8,  'dev_a1',    '192.168.1.102', true,  NULL,                                            NOW()),
(9,  'dev_a4',    '10.0.0.50',     false, 'Account temporarily locked due to 5 failed attempts', NOW() - INTERVAL '10 days'),
(10, 'dev_a4',    '10.0.0.50',     false, 'Invalid credentials',                              NOW() - INTERVAL '10 days'),
(11, 'dev_a4',    '10.0.0.50',     false, 'Invalid credentials',                              NOW() - INTERVAL '10 days'),
(12, 'dev_a4',    '10.0.0.50',     false, 'Invalid credentials',                              NOW() - INTERVAL '10 days'),
(13, 'dev_a4',    '10.0.0.50',     false, 'Invalid credentials',                              NOW() - INTERVAL '10 days'),
(14, 'admin_a',   '203.0.113.45',  true,  NULL,                                            NOW() - INTERVAL '5 days'),
(15, 'unknown',   '198.51.100.23', false, 'Username not found',                               NOW() - INTERVAL '2 days'),
(16, 'owner_a',   '192.168.1.100', true,  NULL,                                            NOW() - INTERVAL '12 hours');

-- ============================================================================
-- 31. USER SESSIONS (active user sessions for session management)
-- ============================================================================
INSERT INTO user_sessions (id, user_id, session_id, ip_address, user_agent, created_at, last_activity, is_active) VALUES
(1,  2, 'sess_7a3f9b2c1d4e5f6', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0', NOW() - INTERVAL '2 hours',  NOW(), true),
(2,  6, 'sess_8b4g0c3d2e5f7g1', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) Safari/605.1', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '10 minutes', true),
(3,  7, 'sess_9c5h1d4e3f6g8h2', '192.168.1.102', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour', true),
(4,  8, 'sess_0d6i2e5f4g7h9i3', '192.168.1.103', 'Mozilla/5.0 (X11; Linux x86_64) Chrome/119.0', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', false),
(5,  3, 'sess_1e7j3f6g5h8i0j4', '192.168.1.104', 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) Safari/605.1', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '30 minutes', true);

-- ============================================================================
-- 32. REFRESH TOKENS (JWT refresh tokens for long-lived sessions)
-- ============================================================================
INSERT INTO refresh_tokens (id, token, user_id, expires_at, created_at, is_revoked) VALUES
(1,  'rt_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c', 2,  NOW() + INTERVAL '7 days',  NOW() - INTERVAL '1 hour',   false),
(2,  'rt_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p', 6,  NOW() + INTERVAL '7 days',  NOW() - INTERVAL '5 hours',  false),
(3,  'rt_2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q', 7,  NOW() + INTERVAL '7 days',  NOW() - INTERVAL '1 day',    false),
(4,  'rt_3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r', 8,  NOW() - INTERVAL '1 day',   NOW() - INTERVAL '3 days',   true),
(5,  'rt_4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s', 3,  NOW() + INTERVAL '7 days',  NOW() - INTERVAL '6 hours',  false),
(6,  'rt_5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t', 4,  NOW() + INTERVAL '7 days',  NOW() - INTERVAL '2 days',   false),
(7,  'rt_6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u', 9,  NOW() - INTERVAL '3 days', NOW() - INTERVAL '5 days',   true);

-- ============================================================================
-- 33. GLOBAL SETTINGS (system-wide configuration key-value pairs)
-- ============================================================================
INSERT INTO global_settings (setting_key, setting_value, description, created_at, updated_at) VALUES
('system.version',                   '1.0.0',              'Current deployed version of the system',                                  NOW(), NOW()),
('system.maintenance_mode',          'false',              'Enable/disable maintenance mode (blocks all non-admin logins)',          NOW(), NOW()),
('system.max_users_per_company',     '500',                'Maximum number of users allowed per company workspace',                  NOW(), NOW()),
('system.allowed_file_extensions',   'pdf,doc,docx,xls,xlsx,png,jpg,jpeg,zip', 'Allowed file upload extensions',             NOW(), NOW()),
('system.session_timeout_minutes',   '30',                 'User session timeout in minutes',                                        NOW(), NOW()),
('system.jwt_token_expiry_minutes',  '30',                 'JWT access token expiry time in minutes',                               NOW(), NOW()),
('system.jwt_refresh_expiry_days',   '7',                  'JWT refresh token expiry time in days',                                 NOW(), NOW()),
('system.login_max_attempts',        '5',                  'Maximum failed login attempts before lockout',                          NOW(), NOW()),
('system.login_lockout_minutes',     '15',                 'Account lockout duration after max failed attempts (minutes)',           NOW(), NOW()),
('notification.push_enabled',        'true',               'Enable push notifications globally',                                     NOW(), NOW()),
('notification.email_enabled',       'true',               'Enable email notifications globally',                                   NOW(), NOW()),
('notification.sms_enabled',        'false',              'Enable SMS notifications (requires SMS provider configuration)',          NOW(), NOW()),
('hr.leave_approval_levels',        '2',                  'Number of approval levels for leave requests (1-3)',                    NOW(), NOW()),
('hr.default_leave_balance',         '12',                 'Default annual leave balance for new employees (days)',                  NOW(), NOW()),
('hr.probation_months',              '3',                  'Probation period length in months for new hires',                        NOW(), NOW()),
('project.sprint_default_duration',  '14',                 'Default sprint duration in days',                                        NOW(), NOW()),
('project.velocity_window_sprints',  '3',                  'Number of past sprints to calculate team velocity',                    NOW(), NOW()),
('storage.max_file_size_mb',         '500',                'Maximum single file upload size in megabytes',                          NOW(), NOW()),
('storage.quota_per_user_gb',        '10',                 'Default storage quota per user in gigabytes',                          NOW(), NOW()),
('gdrive.enabled',                  'true',               'Enable Google Drive integration',                                       NOW(), NOW()),
('gdrive.auto_sync',                'true',               'Automatically sync uploaded files to Google Drive',                     NOW(), NOW()),
('ai.gemini.enabled',                'true',               'Enable Gemini AI Assistant features',                                    NOW(), NOW()),
('ai.gemini.model',                  'gemini-1.5-flash',   'Gemini model to use for AI features',                                   NOW(), NOW()),
('billing.subscription_trial_days',  '14',                 'Free trial period for new company sign-ups (days)',                      NOW(), NOW()),
('billing.invoice_prefix',           'INV',                'Invoice number prefix for billing',                                      NOW(), NOW());

-- ============================================================================
-- 19. POSTGRESQL SEQUENCE RESETTER
-- ============================================================================
SELECT setval(pg_get_serial_sequence('users', 'user_id'), COALESCE(MAX(user_id), 1)) FROM users;
SELECT setval(pg_get_serial_sequence('companies', 'company_id'), COALESCE(MAX(company_id), 1)) FROM companies;
SELECT setval(pg_get_serial_sequence('company_members', 'id'), COALESCE(MAX(id), 1)) FROM company_members;
SELECT setval(pg_get_serial_sequence('company_member_roles', 'id'), COALESCE(MAX(id), 1)) FROM company_member_roles;
SELECT setval(pg_get_serial_sequence('employees', 'employee_id'), COALESCE(MAX(employee_id), 1)) FROM employees;
SELECT setval(pg_get_serial_sequence('leave_requests', 'id'), COALESCE(MAX(id), 1)) FROM leave_requests;
SELECT setval(pg_get_serial_sequence('reviews', 'review_id'), COALESCE(MAX(review_id), 1)) FROM reviews;
SELECT setval(pg_get_serial_sequence('project_expenses', 'expense_id'), COALESCE(MAX(expense_id), 1)) FROM project_expenses;
SELECT setval(pg_get_serial_sequence('workspace_join_requests', 'request_id'), COALESCE(MAX(request_id), 1)) FROM workspace_join_requests;
SELECT setval(pg_get_serial_sequence('projects', 'project_id'), COALESCE(MAX(project_id), 1)) FROM projects;
SELECT setval(pg_get_serial_sequence('project_members', 'id'), COALESCE(MAX(id), 1)) FROM project_members;
SELECT setval(pg_get_serial_sequence('sprints', 'sprint_id'), COALESCE(MAX(sprint_id), 1)) FROM sprints;
SELECT setval(pg_get_serial_sequence('issue_statuses', 'status_id'), COALESCE(MAX(status_id), 1)) FROM issue_statuses;
SELECT setval(pg_get_serial_sequence('issues', 'issue_id'), COALESCE(MAX(issue_id), 1)) FROM issues;
SELECT setval(pg_get_serial_sequence('time_logs', 'log_id'), COALESCE(MAX(log_id), 1)) FROM time_logs;
SELECT setval(pg_get_serial_sequence('issue_comments', 'id'), COALESCE(MAX(id), 1)) FROM issue_comments;
SELECT setval(pg_get_serial_sequence('issue_activities', 'id'), COALESCE(MAX(id), 1)) FROM issue_activities;
SELECT setval(pg_get_serial_sequence('resource_allocations', 'allocation_id'), COALESCE(MAX(allocation_id), 1)) FROM resource_allocations;
SELECT setval(pg_get_serial_sequence('project_goals', 'goal_id'), COALESCE(MAX(goal_id), 1)) FROM project_goals;
SELECT setval(pg_get_serial_sequence('notifications', 'notification_id'), COALESCE(MAX(notification_id), 1)) FROM notifications;
SELECT setval(pg_get_serial_sequence('calendar_events', 'event_id'), COALESCE(MAX(event_id), 1)) FROM calendar_events;
SELECT setval(pg_get_serial_sequence('salary_proposals', 'proposal_id'), COALESCE(MAX(proposal_id), 1)) FROM salary_proposals;
SELECT setval(pg_get_serial_sequence('event_attendees', 'id'), COALESCE(MAX(id), 1)) FROM event_attendees;
SELECT setval(pg_get_serial_sequence('files', 'file_id'), COALESCE(MAX(file_id), 1)) FROM files;
SELECT setval(pg_get_serial_sequence('issue_custom_fields', 'field_id'), COALESCE(MAX(field_id), 1)) FROM issue_custom_fields;
SELECT setval(pg_get_serial_sequence('issue_custom_field_values', 'value_id'), COALESCE(MAX(value_id), 1)) FROM issue_custom_field_values;
SELECT setval(pg_get_serial_sequence('issue_dependencies', 'dependency_id'), COALESCE(MAX(dependency_id), 1)) FROM issue_dependencies;
SELECT setval(pg_get_serial_sequence('login_attempts', 'id'), COALESCE(MAX(id), 1)) FROM login_attempts;
SELECT setval(pg_get_serial_sequence('user_sessions', 'id'), COALESCE(MAX(id), 1)) FROM user_sessions;
SELECT setval(pg_get_serial_sequence('refresh_tokens', 'id'), COALESCE(MAX(id), 1)) FROM refresh_tokens;

-- ============================================================================
-- GEMINI ERP - REVIEW SEED DATA
-- File: 04_review_seed.sql
-- Description: Seeds performance reviews for Smart Assistant scoring
-- Target Company: Tech Corp (company_id = 1), Project HRMS (project_id = 1)
-- ============================================================================

-- Reviews for employee 1 (Nguyễn Thế Anh - user_id=2)
INSERT INTO reviews (employee_id, reviewer_id, company_id, project_id, project_name, review_period, review_type,
    technical_score, attitude_score, soft_skills_score, teamwork_score, total_score, rating,
    comments, next_goals, development_plan, status, start_date, end_date, completed_date, created_at, updated_at)
VALUES
(1, 2, 1, 1, 'HR Management System', 'Quick-HRMS-1', 'SPRINT_REVIEW',
    8.5, 8.0, 7.5, 8.0, 8.13, 'EXCELLENT',
    'Hoàn thành tốt sprint foundation. Kiến trúc ERD chuẩn, code Spring Security sạch.',
    'Hoàn thành Sprint 2 với chất lượng cao hơn',
    'Tham gia khóa học Spring Advanced',
    'APPROVED', CURRENT_DATE - INTERVAL '53 days', CURRENT_DATE - INTERVAL '53 days', CURRENT_DATE - INTERVAL '53 days', NOW(), NOW()),

(1, 2, 1, 1, 'HR Management System', 'Q1-2024', 'PERIODIC',
    8.0, 8.5, 8.0, 8.5, 8.23, 'EXCELLENT',
    'Xuất sắc trong kỳ Q1. Leadership tốt, kỹ thuật vững.',
    'Tiếp tục phát triển kỹ năng Cloud',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', NOW(), NOW()),

-- Reviews for employee 2 (Trần Hoàng Nam - user_id=3)
(2, 2, 1, 1, 'HR Management System', 'Quick-HRMS-7', 'SPRINT_REVIEW',
    7.5, 8.0, 7.0, 7.5, 7.53, 'SATISFACTORY',
    'API CRUD nhân sự hoàn thành. Chất lượng ổn định.',
    'Cải thiện kỹ năng giao tiếp',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '38 days', CURRENT_DATE - INTERVAL '38 days', CURRENT_DATE - INTERVAL '38 days', NOW(), NOW()),

(2, 2, 1, 1, 'HR Management System', 'Q1-2024', 'PERIODIC',
    7.5, 8.0, 7.5, 7.5, 7.65, 'SATISFACTORY',
    'Nhân viên ổn định, hoàn thành công việc đúng hạn.',
    'Nâng cao kỹ thuật backend',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', NOW(), NOW()),

-- Reviews for employee 3 (Lê Thị Tuyết Mai - user_id=4)
(3, 2, 1, 1, 'HR Management System', 'Quick-HRMS-18', 'SPRINT_REVIEW',
    8.0, 9.0, 8.5, 9.0, 8.58, 'EXCELLENT',
    'Dashboard HR xuất sắc. UI/UX mượt mà, biểu đồ trực quan.',
    'Tiếp tục phát huy thiết kế UX',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '14 days', NOW(), NOW()),

(3, 2, 1, 1, 'HR Management System', 'Q1-2024', 'PERIODIC',
    7.5, 9.0, 8.5, 9.0, 8.40, 'EXCELLENT',
    'Thái độ làm việc tuyệt vời, teamwork xuất sắc. Luôn hỗ trợ team.',
    'Phát triển kỹ năng lãnh đạo',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', NOW(), NOW()),

-- Reviews for employee 4 (Phạm Thanh Sơn - user_id=5)
(4, 6, 1, 1, 'HR Management System', 'Q1-2024', 'PERIODIC',
    7.0, 7.5, 7.0, 7.0, 7.18, 'SATISFACTORY',
    'Hoàn thành nhiệm vụ. Cần cải thiện tốc độ làm việc.',
    'Tăng tốc độ xử lý công việc',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', NOW(), NOW()),

-- Reviews for employee 5 (Vũ Minh Trí - user_id=6) - Project Manager
(5, 2, 1, 1, 'HR Management System', 'Quick-HRMS-3', 'SPRINT_REVIEW',
    8.0, 9.0, 8.0, 8.5, 8.35, 'EXCELLENT',
    'Sprint Security JWT triển khai tốt, có 1 lần rework nhưng đã fix nhanh.',
    'Quản lý sprint hiệu quả hơn',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '45 days', NOW(), NOW()),

(5, 2, 1, 1, 'HR Management System', 'Q1-2024', 'PERIODIC',
    8.0, 9.0, 8.5, 8.5, 8.53, 'EXCELLENT',
    'PM xuất sắc. Điều phối team hiệu quả, deadline luôn đạt.',
    'Học thêm về AI/ML',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', NOW(), NOW()),

-- Reviews for employee 6 (Hoàng Quốc Bảo - user_id=7) - Senior Backend
(6, 6, 1, 1, 'HR Management System', 'Quick-HRMS-1', 'SPRINT_REVIEW',
    8.5, 7.5, 7.0, 8.0, 7.93, 'SATISFACTORY',
    'Code sạch, architecture tốt. Spring Boot expert.',
    'Cải thiện soft skills',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '53 days', CURRENT_DATE - INTERVAL '53 days', CURRENT_DATE - INTERVAL '53 days', NOW(), NOW()),

(6, 6, 1, 1, 'HR Management System', 'Quick-HRMS-15', 'SPRINT_REVIEW',
    9.0, 8.0, 7.5, 8.0, 8.38, 'EXCELLENT',
    'Payroll Engine phức tạp nhưng hoàn thành xuất sắc. Có 1 rework ban đầu.',
    'Tiếp tục maintain chất lượng cao',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '18 days', CURRENT_DATE - INTERVAL '18 days', CURRENT_DATE - INTERVAL '18 days', NOW(), NOW()),

(6, 2, 1, 1, 'HR Management System', 'Q1-2024', 'PERIODIC',
    8.5, 8.0, 7.5, 8.0, 8.23, 'EXCELLENT',
    'Senior dev xuất sắc. Chất lượng code cao, hỗ trợ team tốt.',
    'Mentoring junior developers',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', NOW(), NOW()),

-- Reviews for employee 7 (Nguyễn Song Hào - user_id=8) - Senior Frontend
(7, 6, 1, 1, 'HR Management System', 'Quick-HRMS-9', 'SPRINT_REVIEW',
    7.5, 8.0, 8.0, 8.5, 7.93, 'SATISFACTORY',
    'Kanban UI đẹp. Có 1 lần rework do design change.',
    'Kỹ năng React chuyên sâu hơn',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '31 days', CURRENT_DATE - INTERVAL '31 days', CURRENT_DATE - INTERVAL '31 days', NOW(), NOW()),

(7, 6, 1, 1, 'HR Management System', 'Quick-HRMS-18', 'SPRINT_REVIEW',
    8.0, 8.5, 8.5, 9.0, 8.45, 'EXCELLENT',
    'Dashboard HR xuất sắc. UX mượt mà, responsive tốt.',
    'Học thêm về performance optimization',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '14 days', NOW(), NOW()),

(7, 2, 1, 1, 'HR Management System', 'Q1-2024', 'PERIODIC',
    8.0, 8.5, 8.5, 8.5, 8.33, 'EXCELLENT',
    'Frontend xuất sắc. Design system nhất quán, UI đẹp.',
    'Chia sẻ kiến thức React với team',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', NOW(), NOW()),

-- Reviews for employee 8 (Phan Huy Khánh - user_id=9) - Backend Developer
(8, 6, 1, 1, 'HR Management System', 'Quick-HRMS-14', 'SPRINT_REVIEW',
    7.0, 8.0, 7.5, 7.5, 7.48, 'SATISFACTORY',
    'API đơn nghỉ phép tốt. Làm việc ổn định.',
    'Kỹ năng communication',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '21 days', CURRENT_DATE - INTERVAL '21 days', CURRENT_DATE - INTERVAL '21 days', NOW(), NOW()),

(8, 6, 1, 1, 'HR Management System', 'Quick-HRMS-22', 'SPRINT_REVIEW',
    7.5, 8.0, 7.5, 8.0, 7.78, 'SATISFACTORY',
    'Velocity report hoàn thành. Hỗ trợ team tốt.',
    'Cải thiện technical documentation',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '2 days', NOW(), NOW()),

(8, 2, 1, 1, 'HR Management System', 'Q1-2024', 'PERIODIC',
    7.5, 8.0, 7.5, 7.5, 7.65, 'SATISFACTORY',
    'Developer ổn định. Cần tăng tốc độ hoàn thành task.',
    'Hoàn thành task nhanh hơn',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', NOW(), NOW()),

-- Reviews for employee 9 (Trương Đình Khoa - user_id=10) - React Native Dev
(9, 6, 1, NULL, NULL, 'Q1-2024', 'PERIODIC',
    7.0, 7.5, 7.0, 7.0, 7.18, 'SATISFACTORY',
    'Làm việc tốt, hoàn thành task được giao.',
    'Kỹ năng mobile development',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', NOW(), NOW()),

-- Reviews for employee 10 (Đỗ Thùy Trang - user_id=11) - QA
(10, 2, 1, NULL, NULL, 'Q1-2024', 'PERIODIC',
    6.5, 8.5, 8.0, 8.0, 7.55, 'SATISFACTORY',
    'QA tận tâm. Test case đầy đủ, phát hiện nhiều bug quan trọng.',
    'Học thêm automation testing',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', NOW(), NOW()),

-- Reviews for employee 11 (Nguyễn Văn Đạt - user_id=12) - QA Lead
(11, 2, 1, 1, 'HR Management System', 'Q1-2024', 'PERIODIC',
    7.0, 8.0, 7.5, 8.0, 7.60, 'SATISFACTORY',
    'QA Lead có kinh nghiệm. Automation test tiến triển tốt.',
    'Mở rộng coverage automation',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '15 days', NOW(), NOW()),

-- Additional sprint review for active sprint (Sprint 4)
(6, 6, 1, 1, 'HR Management System', 'Quick-HRMS-20', 'SPRINT_REVIEW',
    8.0, 7.5, 7.5, 8.0, 7.85, 'SATISFACTORY',
    'Google Drive integration hoàn thành tốt, giao diện đơn giản.',
    'Tiếp tục với sprint tiếp theo',
    NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '10 days', NOW(), NOW()),

(7, 6, 1, 1, 'HR Management System', 'Quick-HRMS-21', 'SPRINT_REVIEW',
    8.0, 8.5, 8.5, 8.5, 8.33, 'EXCELLENT',
    'Lịch làm việc đẹp, responsive. Feature complete.',
    NULL, NULL,
    'APPROVED', CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE - INTERVAL '8 days', NOW(), NOW()),

-- In-progress review (not yet approved)
(6, 6, 1, 1, 'HR Management System', 'Quick-HRMS-23', 'SPRINT_REVIEW',
    NULL, NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL,
    'PENDING', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, NULL, NOW(), NOW()),

-- Pending review
(8, 6, 1, 1, 'HR Management System', 'Quick-HRMS-24', 'SPRINT_REVIEW',
    NULL, NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL,
    'PENDING', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days', NULL, NOW(), NOW());

-- Reset sequence for reviews
SELECT setval(pg_get_serial_sequence('reviews', 'review_id'), COALESCE(MAX(review_id), 1)) FROM reviews;

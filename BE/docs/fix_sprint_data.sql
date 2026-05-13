-- =====================================================
-- FIX: GÁN ISSUES VÀO SPRINT ĐỂ SPRINT HIỂN THỊ DATA
-- Chạy script này 1 lần để fix sprint trống
-- =====================================================
USE DACN;
GO

-- Kiểm tra trạng thái hiện tại
PRINT N'=== TRƯỚC KHI FIX ===';

SELECT s.sprint_id, s.name, s.status,
       (SELECT COUNT(*) FROM issues i WHERE i.sprint_id = s.sprint_id) AS issue_count
FROM sprints s
WHERE s.project_id = (SELECT project_id FROM projects WHERE key_project = 'HRMS')
ORDER BY s.sprint_id;

PRINT N'';
PRINT N'Issues không có sprint (backlog):';
SELECT COUNT(*) AS backlog_count
FROM issues
WHERE project_id = (SELECT project_id FROM projects WHERE key_project = 'HRMS')
  AND sprint_id IS NULL;

-- =====================================================
-- FIX 1: Gán các issue backlog vào Sprint 5 (Planning)
-- =====================================================
DECLARE @hrms_p BIGINT, @s5 BIGINT, @s4 BIGINT;
SELECT @hrms_p = project_id FROM projects WHERE key_project = 'HRMS';
SELECT @s5 = sprint_id FROM sprints WHERE name LIKE 'Sprint 5%' AND project_id = @hrms_p;
SELECT @s4 = sprint_id FROM sprints WHERE name LIKE 'Sprint 4%' AND project_id = @hrms_p;

-- Gán issue backlog vào Sprint 5
IF @s5 IS NOT NULL
BEGIN
    UPDATE issues
    SET sprint_id = @s5, updated_at = GETDATE()
    WHERE project_id = @hrms_p
      AND sprint_id IS NULL;

    PRINT N'✅ Đã gán ' + CAST(@@ROWCOUNT AS VARCHAR) + N' issues backlog vào Sprint 5';
END

-- =====================================================
-- Kiểm tra kết quả
-- =====================================================
PRINT N'';
PRINT N'=== SAU KHI FIX ===';

SELECT s.sprint_id, s.name, s.status,
       (SELECT COUNT(*) FROM issues i WHERE i.sprint_id = s.sprint_id) AS issue_count,
       (SELECT COUNT(*) FROM issues i WHERE i.sprint_id = s.sprint_id AND i.status_id = (SELECT status_id FROM issue_statuses WHERE name = 'Done')) AS done_count
FROM sprints s
WHERE s.project_id = @hrms_p
ORDER BY s.sprint_id;

SELECT COUNT(*) AS remaining_backlog
FROM issues
WHERE project_id = @hrms_p AND sprint_id IS NULL;

PRINT N'✅ FIX COMPLETE!';
GO

-- =====================================================
-- Fix Corrupted GioiTinh (Gender) Values
-- Run this script to clean up corrupted data caused by
-- character encoding issues
-- =====================================================

-- Update corrupted "Nữ" values (stored as "N?" or similar)
UPDATE nhan_vien
SET gioi_tinh = N'Nữ'
WHERE gioi_tinh LIKE 'N%'
  AND gioi_tinh != 'Nam'
  AND LEN(gioi_tinh) <= 3;

-- Update corrupted "Khác" values (if any)
UPDATE nhan_vien
SET gioi_tinh = N'Khác'
WHERE gioi_tinh LIKE 'Kh%'
  AND gioi_tinh != N'Khác'
  AND LEN(gioi_tinh) <= 4;

-- Verify the fix
SELECT gioi_tinh, COUNT(*) as count
FROM nhan_vien
GROUP BY gioi_tinh
ORDER BY gioi_tinh;

-- Expected output:
-- Khác  | count
-- Nam   | count  
-- Nữ    | count

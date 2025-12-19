import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePermissions, useErrorHandler } from '@/shared/hooks';
import { commonStyles } from '@/shared/utils';
import { colors, typography, spacing } from '@/shared/styles/theme';
import { attendanceService } from '@/shared/services/attendance.service';
import { employeesService } from '@/features/hr/shared/services/employees.service';
import { useToast } from '@/shared/components/ui';

export default function SharedAttendancePage({
  title = "Chấm công",
  breadcrumb = "Cá nhân / Chấm công",
  viewMode = "personal", // "personal" | "management"
  glassMode = false
}) {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Pagination States
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [todayStatus, setTodayStatus] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  const { user: authUser } = useAuth();
  const { user: currentUser, isEmployee, isHRManager, isAccountingManager } = usePermissions();
  const { handleError } = useErrorHandler();
  const toast = useToast();

  // Helper function to get Vietnamese status label for toast notifications
  const getStatusLabel = (trangThai, isLate, isEarlyLeave) => {
    const statusLabels = {
      DU_GIO: '✓ Đúng giờ',
      DI_TRE: '⏰ Đi muộn',
      VE_SOM: '🏃 Về sớm',
      NGHI_PHEP: '📋 Nghỉ phép',
      NGHI_KHONG_PHEP: '❌ Nghỉ không phép'
    };

    // If trangThai exists, use it
    if (trangThai && statusLabels[trangThai]) {
      return statusLabels[trangThai];
    }

    // Fallback to boolean flags
    if (isEarlyLeave) return '🏃 Về sớm';
    if (isLate) return '⏰ Đi muộn';
    return '✓ Đúng giờ';
  };

  // Glass styles overrides
  const glassStyles = glassMode ? {
    container: {
      background: 'rgba(255, 255, 255, 0.25)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
      color: '#2d3436' // Dark text for readability on light glass
    },
    card: {
      background: 'rgba(255, 255, 255, 0.4)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.5)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)'
    },
    text: {
      color: '#2d3436'
    },
    heading: {
      color: '#2d3436',
      textShadow: '0 1px 2px rgba(255,255,255,0.2)'
    },
    tableHeader: {
      background: 'rgba(255, 255, 255, 0.85)', // Increased opacity
      backdropFilter: 'blur(12px)', // Stronger blur
      color: '#2d3436',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)' // Separation shadow
    },
    input: {
      background: 'rgba(255, 255, 255, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.6)',
      color: '#2d3436'
    }
  } : {};

  // Office coordinates (HUTECH Khu E - Khu Công nghệ Cao)
  const OFFICE_LOCATION = {
    latitude: 10.855059,
    longitude: 106.779390,
    address: 'HUTECH Khu E, Lô E1, Khu Công nghệ Cao, Xa lộ Hà Nội, TP. Thủ Đức, TP.HCM'
  };
  const MAX_DISTANCE_METERS = 50000; // 50km để test, production nên đổi về 500

  useEffect(() => {
    loadAttendanceData();
  }, [selectedMonth, selectedYear, viewMode]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, selectedMonth, selectedYear]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (viewMode === "personal" && currentUser?.userId) {
        const employeeRes = await employeesService.getByUserId(currentUser.userId);
        const employeeId = employeeRes?.nhanvienId;

        if (employeeId) {
          // 1. Get Attendance Records
          const records = await attendanceService.getByMonth(employeeId, selectedYear, selectedMonth);

          // Map API response to component state
          const mappedRecords = Array.isArray(records) ? records.map(r => ({
            id: r.chamcongId,
            ngay: r.ngayCham,
            gioVao: r.gioVao ? r.gioVao.substring(0, 5) : null,
            gioRa: r.gioRa ? r.gioRa.substring(0, 5) : null,
            tongGio: r.soGioLam,
            trangThai: r.trangThai,
            ghiChu: r.ghiChu
          })) : [];

          // Sort by date desc
          mappedRecords.sort((a, b) => new Date(b.ngay) - new Date(a.ngay));

          setAttendanceRecords(mappedRecords);

          // 2. Get Today's Status
          const status = await attendanceService.getStatus(employeeId);
          setTodayStatus({
            daCheckIn: status.checkedIn,
            gioCheckIn: status.gioVao ? status.gioVao.substring(0, 5) : null,
            daCheckOut: status.checkedOut,
            gioCheckOut: status.gioRa ? status.gioRa.substring(0, 5) : null,
            viTriCheckIn: null,
            viTriCheckOut: null
          });
        }
      } else if (viewMode === "management") {
        // Management View: Fetch all attendance for range
        const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        // Calculate last day of month
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;

        const records = await attendanceService.getByDateRange(startDate, endDate);

        const mappedRecords = Array.isArray(records) ? records.map(r => ({
          id: r.chamcongId,
          ngay: r.ngayCham,
          gioVao: r.gioVao ? r.gioVao.substring(0, 5) : null,
          gioRa: r.gioRa ? r.gioRa.substring(0, 5) : null,
          tongGio: r.soGioLam,
          trangThai: r.trangThai,
          // Use flat fields from DTO update
          employeeName: r.hoTenNhanVien || 'Unknown',
          department: r.phongBan,
          avatar: r.avatarUrl // Mapped from backend
        })) : [];

        // Sort by date desc
        mappedRecords.sort((a, b) => new Date(b.ngay) - new Date(a.ngay));

        setAttendanceRecords(mappedRecords);
      } else {
        setAttendanceRecords([]);
      }

      setLoading(false);
    } catch (err) {
      const errorMessage = handleError(err, { context: 'load_attendance' });
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Calculate distance between two GPS coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distance in meters
  };

  // Get user's GPS location
  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Trình duyệt không hỗ trợ GPS'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          let message = 'Không thể lấy vị trí GPS';
          if (error.code === error.PERMISSION_DENIED) {
            message = 'Bạn đã từ chối quyền truy cập vị trí';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'Vị trí không khả dụng';
          } else if (error.code === error.TIMEOUT) {
            message = 'Hết thời gian chờ GPS';
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0
        }
      );
    });
  };

  const handleGPSCheckIn = async () => {
    try {
      setGpsLoading(true);
      setGpsError(null);

      if (!currentUser?.userId) {
        throw new Error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      }

      // Get GPS location
      const location = await getUserLocation();

      // Calculate distance from office
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        OFFICE_LOCATION.latitude,
        OFFICE_LOCATION.longitude
      );

      // Validate distance
      if (distance > MAX_DISTANCE_METERS) {
        setGpsError(`Bạn đang cách văn phòng ${distance}m. Vui lòng đến gần hơn (trong bán kính ${MAX_DISTANCE_METERS}m)`);
        setGpsLoading(false);
        return;
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Get employee ID
      const employeeRes = await employeesService.getByUserId(currentUser.userId);
      const employeeId = employeeRes?.nhanvienId;

      if (employeeId) {
        const result = await attendanceService.checkIn(employeeId, today);

        // Refresh data
        await loadAttendanceData();

        // Get status label based on response
        const statusLabel = getStatusLabel(result?.trangThai, result?.isLate);
        toast.success(`Check-in thành công! ${statusLabel} | Khoảng cách: ${distance}m`);
      } else {
        throw new Error('Không tìm thấy thông tin nhân viên.');
      }

      setGpsLoading(false);
    } catch (err) {
      setGpsError(err.message || 'Lỗi khi check-in');
      setGpsLoading(false);
    }
  };

  const handleGPSCheckOut = async () => {
    try {
      setGpsLoading(true);
      setGpsError(null);

      if (!currentUser?.userId) {
        throw new Error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      }

      // Get GPS location
      const location = await getUserLocation();

      // Calculate distance from office
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        OFFICE_LOCATION.latitude,
        OFFICE_LOCATION.longitude
      );

      // Get employee ID
      const employeeRes = await employeesService.getByUserId(currentUser.userId);
      const employeeId = employeeRes?.nhanvienId;

      if (employeeId) {
        // Need to find today's record to check out
        const today = new Date().toISOString().split('T')[0];
        const records = await attendanceService.getByMonth(employeeId, selectedYear, selectedMonth);
        const todayRecord = records.find(r => r.ngayCham === today);

        if (todayRecord && todayRecord.chamcongId) {
          const result = await attendanceService.checkOut(todayRecord.chamcongId);

          // Refresh data
          await loadAttendanceData();

          // Get status label based on response
          const statusLabel = getStatusLabel(result?.trangThai, result?.isLate, result?.isEarlyLeave);
          toast.success(`Check-out thành công! ${statusLabel} | Khoảng cách: ${distance}m`);
        } else {
          throw new Error("Không tìm thấy thông tin chấm công hôm nay để check-out");
        }
      } else {
        throw new Error('Không tìm thấy thông tin nhân viên.');
      }

      setGpsLoading(false);
    } catch (err) {
      setGpsError(err.message || 'Lỗi khi check-out');
      setGpsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      DU_GIO: { bg: 'rgba(220, 252, 231, 0.8)', color: '#15803d', label: '✓ Bình thường' },
      DI_TRE: { bg: 'rgba(255, 237, 213, 0.8)', color: '#c2410c', label: '⏰ Đi muộn' },
      VE_SOM: { bg: 'rgba(254, 243, 199, 0.8)', color: '#d97706', label: '🏃 Về sớm' },
      NGHI_PHEP: { bg: 'rgba(219, 234, 254, 0.8)', color: '#2563eb', label: '📋 Nghỉ phép' },
      NGHI_KHONG_PHEP: { bg: 'rgba(254, 226, 226, 0.8)', color: '#b91c1c', label: '❌ Vắng mặt' }
    };
    const s = config[status] || { bg: 'rgba(243, 244, 246, 0.8)', color: '#4b5563', label: status || 'Unknown' };
    return (
      <span style={{
        background: s.bg, color: s.color, padding: '4px 10px', borderRadius: 8,
        fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap',
        boxShadow: glassMode ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
        backdropFilter: 'blur(4px)'
      }}>
        {s.label}
      </span>
    );
  };

  // --- Filtering & Pagination Logic ---
  const filteredRecords = attendanceRecords.filter(record => {
    if (filterStatus === 'ALL') return true;
    return record.trangThai === filterStatus;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const currentRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Calculate stats based on ALL records for the month
  const stats = {
    totalDays: attendanceRecords.length,
    // Fix: Match backend enums for filtering
    normalDays: attendanceRecords.filter(r => r.trangThai === 'DU_GIO').length,
    lateDays: attendanceRecords.filter(r => r.trangThai === 'DI_TRE').length,
    earlyDays: attendanceRecords.filter(r => r.trangThai === 'VE_SOM').length,
    totalHours: attendanceRecords.reduce((sum, r) => sum + (r.tongGio || 0), 0)
  };

  // Loading View
  if (loading) {
    return (
      <div style={{ ...commonStyles.pageContainer, ...(glassMode ? glassStyles.container : {}) }}>
        <div style={{ textAlign: 'center', padding: spacing['6xl'] }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2rem', color: glassMode ? '#2d3436' : colors.primary }}></i>
          <div style={{ fontSize: typography.base, color: glassMode ? '#636e72' : colors.textSecondary, marginTop: spacing.md }}>
            Đang tải dữ liệu chấm công...
          </div>
        </div>
      </div>
    );
  }

  // Error View
  if (error) {
    return (
      <div style={{ ...commonStyles.pageContainer, ...(glassMode ? glassStyles.container : {}) }}>
        <div style={{ textAlign: 'center', padding: spacing['6xl'] }}>
          <div style={{ fontSize: typography.xl, color: colors.error, marginBottom: spacing.lg }}>
            ❌ {error}
          </div>
          <button
            onClick={loadAttendanceData}
            style={{
              background: colors.gradientPrimary,
              color: '#fff', border: 'none', borderRadius: spacing.lg, padding: `${spacing.md} ${spacing.xl}`,
              fontSize: typography.sm, fontWeight: typography.bold, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            🔄 Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...commonStyles.pageContainer,
      ...(glassMode ? glassStyles.container : {}),
      height: '100%',
      // Ensure flex container fills height but doesn't overflow parent
      display: 'flex',
      flexDirection: 'column',
      // Fix React warning by overriding padding shorthand completely
      padding: '20px',
      overflow: 'hidden' // Prevent page-level scroll if we want internal scroll
    }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl, flexShrink: 0 }}>
        <div style={{
          fontSize: typography.sm,
          color: glassMode ? '#636e72' : colors.textSecondary,
          marginBottom: spacing.sm,
          fontWeight: typography.semibold,
          textTransform: 'uppercase'
        }}>
          {breadcrumb}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{
            ...commonStyles.heading1,
            ...(glassMode ? glassStyles.heading : {})
          }}>
            {title}
          </h1>
          {viewMode === "personal" && (
            <div style={{ display: 'flex', gap: spacing.md }}>
              {/* GPS Buttons Logic */}
              {!todayStatus?.daCheckIn ? (
                <button
                  style={{
                    background: gpsLoading ? colors.textMuted : colors.gradientSuccess,
                    color: '#fff', border: 'none', borderRadius: spacing.lg, padding: `${spacing.md} ${spacing.xl}`,
                    fontSize: typography.sm, fontWeight: typography.bold, cursor: gpsLoading ? 'not-allowed' : 'pointer',
                    opacity: gpsLoading ? 0.7 : 1,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  onClick={handleGPSCheckIn}
                  disabled={gpsLoading}
                >
                  {gpsLoading ? '⏳ Đang lấy GPS...' : '📍 GPS Check-in'}
                </button>
              ) : !todayStatus?.daCheckOut ? (
                <button
                  style={{
                    background: gpsLoading ? colors.textMuted : colors.gradientWarning,
                    color: '#fff', border: 'none', borderRadius: spacing.lg, padding: `${spacing.md} ${spacing.xl}`,
                    fontSize: typography.sm, fontWeight: typography.bold, cursor: gpsLoading ? 'not-allowed' : 'pointer',
                    opacity: gpsLoading ? 0.7 : 1,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  onClick={handleGPSCheckOut}
                  disabled={gpsLoading}
                >
                  {gpsLoading ? '⏳ Đang lấy GPS...' : '📍 GPS Check-out'}
                </button>
              ) : (
                <div style={{
                  background: colors.success, color: '#fff', borderRadius: spacing.lg, padding: `${spacing.md} ${spacing.xl}`,
                  fontSize: typography.sm, fontWeight: typography.bold,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  ✅ Đã hoàn thành
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {gpsError && (
        <div style={{
          background: 'rgba(254, 226, 226, 0.9)',
          border: `1px solid ${colors.error}`,
          borderRadius: 12,
          marginBottom: spacing.xl,
          padding: spacing.md
        }}>
          <span style={{ color: colors.error, fontWeight: 'bold' }}>⚠️ Lỗi GPS: {gpsError}</span>
        </div>
      )}

      {/* Today Status for Personal View */}
      {viewMode === "personal" && todayStatus && (
        <div style={{
          padding: '24px', borderRadius: '20px', marginBottom: '24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>Check-in lúc</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{todayStatus.gioCheckIn || '--:--'}</div>
            </div>
            <div style={{ height: '40px', width: '1px', background: 'rgba(255,255,255,0.3)' }}></div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>Check-out lúc</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{todayStatus.gioCheckOut || '--:--'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing.lg, marginBottom: spacing.xl }}>
        <div style={{ ...commonStyles.cardBase, ...(glassMode ? glassStyles.card : {}), textAlign: 'center', padding: '15px' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>📅</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: glassMode ? '#2d3436' : colors.textPrimary }}>{stats.totalDays}</div>
          <div style={{ fontSize: '0.8rem', color: glassMode ? '#636e72' : colors.textSecondary }}>Ngày làm việc</div>
        </div>
        <div style={{ ...commonStyles.cardBase, ...(glassMode ? glassStyles.card : {}), textAlign: 'center', padding: '15px' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>✅</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: colors.success }}>{stats.normalDays}</div>
          <div style={{ fontSize: '0.8rem', color: glassMode ? '#636e72' : colors.textSecondary }}>Bình thường</div>
        </div>
        <div style={{ ...commonStyles.cardBase, ...(glassMode ? glassStyles.card : {}), textAlign: 'center', padding: '15px' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>⏰</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: colors.warning }}>{stats.lateDays}</div>
          <div style={{ fontSize: '0.8rem', color: glassMode ? '#636e72' : colors.textSecondary }}>Đi muộn</div>
        </div>
        <div style={{ ...commonStyles.cardBase, ...(glassMode ? glassStyles.card : {}), textAlign: 'center', padding: '15px' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>🕐</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: colors.primary }}>{stats.totalHours.toFixed(1)}</div>
          <div style={{ fontSize: '0.8rem', color: glassMode ? '#636e72' : colors.textSecondary }}>Tổng giờ</div>
        </div>
      </div>

      {/* Controls: Filter inputs & Status - Grouped together */}
      <div style={{ display: 'flex', gap: spacing.lg, marginBottom: spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          style={{ ...commonStyles.inputBase, width: 'auto', ...(glassMode ? glassStyles.input : {}) }}
        >
          {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>)}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          style={{ ...commonStyles.inputBase, width: 'auto', ...(glassMode ? glassStyles.input : {}) }}
        >
          <option value={2024}>2024</option>
          <option value={2025}>2025</option>
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ ...commonStyles.inputBase, width: 'auto', minWidth: '180px', ...(glassMode ? glassStyles.input : {}) }}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="DU_GIO">Bình thường</option>
          <option value="DI_TRE">Đi muộn</option>
          <option value="VE_SOM">Về sớm</option>
          <option value="NGHI_PHEP">Nghỉ phép</option>
          <option value="NGHI_KHONG_PHEP">Vắng mặt</option>
        </select>
      </div>

      {/* Data Table Container - Fixed height overlap by removing fixed height and dealing with flex */}
      <div style={{
        ...commonStyles.cardBase,
        ...(glassMode ? glassStyles.card : {}),
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: 0 // Remove padding to let table span full width
      }}>
        <div style={{ padding: spacing.lg, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <h3 style={{
            ...commonStyles.heading3,
            ...(glassMode ? glassStyles.heading : {}),
            margin: 0
          }}>
            📊 Lịch sử chấm công
          </h3>
        </div>

        {filteredRecords.length > 0 ? (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* table-layout: fixed might help with text overlap if columns are too narrow, but let's try auto first with proper min-widths */}
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', color: glassMode ? '#636e72' : colors.textSecondary, borderBottom: '1px solid rgba(0,0,0,0.05)', ...(glassMode ? glassStyles.tableHeader : { background: '#f8f9fa' }), whiteSpace: 'nowrap', minWidth: '110px' }}>Ngày</th>
                    {viewMode === "management" && (
                      <th style={{ padding: spacing.md, textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', color: glassMode ? '#636e72' : colors.textSecondary, borderBottom: '1px solid rgba(0,0,0,0.05)', ...(glassMode ? glassStyles.tableHeader : { background: '#f8f9fa' }), whiteSpace: 'nowrap', minWidth: '220px' }}>Nhân viên</th>
                    )}
                    <th style={{ padding: spacing.md, textAlign: 'center', fontSize: '0.8rem', textTransform: 'uppercase', color: glassMode ? '#636e72' : colors.textSecondary, borderBottom: '1px solid rgba(0,0,0,0.05)', ...(glassMode ? glassStyles.tableHeader : { background: '#f8f9fa' }), whiteSpace: 'nowrap', minWidth: '140px' }}>Check In / Out</th>
                    <th style={{ padding: spacing.md, textAlign: 'center', fontSize: '0.8rem', textTransform: 'uppercase', color: glassMode ? '#636e72' : colors.textSecondary, borderBottom: '1px solid rgba(0,0,0,0.05)', ...(glassMode ? glassStyles.tableHeader : { background: '#f8f9fa' }), whiteSpace: 'nowrap', minWidth: '80px' }}>Tổng giờ</th>
                    <th style={{ padding: spacing.md, textAlign: 'center', fontSize: '0.8rem', textTransform: 'uppercase', color: glassMode ? '#636e72' : colors.textSecondary, borderBottom: '1px solid rgba(0,0,0,0.05)', ...(glassMode ? glassStyles.tableHeader : { background: '#f8f9fa' }), whiteSpace: 'nowrap', minWidth: '130px' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map((record, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.2s', background: index % 2 === 0 ? 'rgba(255,255,255,0.1)' : 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)'} onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255,255,255,0.1)' : 'transparent'}>
                      <td style={{ padding: spacing.md, fontSize: typography.sm, color: glassMode ? '#2d3436' : colors.textPrimary, verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{new Date(record.ngay).toLocaleDateString('vi-VN')}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{record.ngay}</div>
                      </td>
                      {viewMode === "management" && (
                        <td style={{ padding: spacing.md, fontSize: typography.sm, color: glassMode ? '#2d3436' : colors.textPrimary, verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {record.avatar ? (
                              <img src={record.avatar} alt="Avt" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', color: '#555', flexShrink: 0 }}>
                                {record.employeeName ? record.employeeName.charAt(0).toUpperCase() : '?'}
                              </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={record.employeeName}>{record.employeeName}</div>
                              <div style={{ fontSize: '0.75rem', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={record.department || 'Chưa cập nhật'}>{record.department || 'Chưa cập nhật'}</div>
                            </div>
                          </div>
                        </td>
                      )}
                      <td style={{ padding: spacing.md, textAlign: 'center', color: glassMode ? '#2d3436' : colors.textPrimary, verticalAlign: 'middle' }}>
                        <div style={{ fontSize: typography.sm, fontWeight: 600, whiteSpace: 'nowrap' }}>{record.gioVao || '--:--'} - {record.gioRa || '--:--'}</div>
                      </td>
                      <td style={{ padding: spacing.md, textAlign: 'center', color: glassMode ? '#2d3436' : colors.textPrimary, fontWeight: 600, verticalAlign: 'middle' }}>
                        {record.tongGio ? `${record.tongGio}h` : '-'}
                      </td>
                      <td style={{ padding: spacing.md, textAlign: 'center', verticalAlign: 'middle' }}>
                        {getStatusBadge(record.trangThai)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{ padding: spacing.md, borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm }}>
              <span style={{ fontSize: typography.sm, marginRight: spacing.md, color: glassMode ? '#636e72' : colors.textSecondary }}>
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  background: currentPage === 1 ? 'rgba(0,0,0,0.1)' : colors.primary, color: '#fff', fontSize: typography.sm
                }}
              >
                &lt; Trước
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  background: currentPage === totalPages ? 'rgba(0,0,0,0.1)' : colors.primary, color: '#fff', fontSize: typography.sm
                }}
              >
                Sau &gt;
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: spacing['4xl'], opacity: 0.7 }}>
            <i className="fa-regular fa-calendar-xmark" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
            <div style={{ fontSize: typography.lg, fontWeight: 600 }}>
              Chưa có dữ liệu chấm công
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

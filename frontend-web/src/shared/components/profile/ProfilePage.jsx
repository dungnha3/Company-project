import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { formatCurrency, commonStyles } from '@/shared/utils';
import { colors, typography, spacing } from '@/shared/styles/theme';
import { profileService } from '@/shared/services/profile.service';
import { employeesService } from '@/features/hr/shared/services/employees.service';
import { payrollService } from '@/shared/services/payroll.service';
import { useToast } from '@/shared/components/ui';

export default function SharedProfilePage({
  title = "Hồ sơ cá nhân",
  breadcrumb = "Cá nhân / Hồ sơ cá nhân",
  allowEdit = true,
  userRole = "User",
  onProfileUpdate,
  onAvatarChange,
  glassMode = false
}) {
  const { user: authUser } = useAuth();
  const toast = useToast();
  const username = authUser?.username || localStorage.getItem('username') || 'User';

  const glassStyles = {
    card: {
      background: 'rgba(255, 255, 255, 0.25)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
      color: '#2d3436'
    },
    input: {
      background: 'rgba(255, 255, 255, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      color: '#2d3436'
    },
    heading: {
      color: '#2d3436',
      textShadow: '0 1px 1px rgba(255,255,255,0.5)'
    },
    label: {
      color: '#2d3436'
    }
  };

  // Basic auth check
  if (!authUser && !username) {
    return (
      <div style={{ padding: '24px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 20, color: '#ef4444', marginBottom: 16 }}>❌ Không có quyền truy cập</div>
        <div style={{ fontSize: 14, color: '#7b809a' }}>Vui lòng đăng nhập để xem thông tin cá nhân</div>
      </div>
    );
  }

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [showSalary, setShowSalary] = useState(false);
  const [showEstimatedSalary, setShowEstimatedSalary] = useState(false);
  const [estimatedSalary, setEstimatedSalary] = useState(null);
  const [error, setError] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Get user profile (UserDTO)
      const userProfile = await profileService.getProfile();
      console.log('User Profile:', userProfile);

      // Step 2: Check if user has linked employee
      if (!userProfile.nhanvienId) {
        // User exists but no employee linked
        setEmployee(null);
        setLoading(false);
        return;
      }

      // Step 3: Get employee details using userId (Employee role uses /nhan-vien/user/{userId})
      const employeeData = await employeesService.getByUserId(userProfile.userId);
      console.log('📋 Employee Data Full:', employeeData);
      console.log('📄 Employee fields detail:');
      console.log('  - hoTen:', employeeData.hoTen);
      console.log('  - email:', employeeData.email);
      console.log('  - sdt:', employeeData.sdt);
      console.log('  - diaChi:', employeeData.diaChi);
      console.log('  - ngayVaoLam:', employeeData.ngayVaoLam);
      console.log('  - tenPhongBan:', employeeData.tenPhongBan, '✅ (CORRECT FIELD)');
      console.log('  - tenChucVu:', employeeData.tenChucVu, '✅ (CORRECT FIELD)');
      console.log('  - luongCoBan:', employeeData.luongCoBan);

      // Step 4: Merge user and employee data
      const mergedData = {
        ...employeeData,
        // Add user-specific fields
        username: userProfile.username,
        email: userProfile.email || employeeData.email,
        userId: userProfile.userId,
        avatarUrl: userProfile.avatarUrl, // Use avatarUrl from User, not NhanVien
      };

      setEmployee(mergedData);

      // Step 5: Fetch estimated salary (current month)
      try {
        const now = new Date();
        // Use getByEmployeePeriod to get payroll for specific month/year
        const payrollRes = await payrollService.getByEmployeePeriod(mergedData.nhanvienId, now.getMonth() + 1, now.getFullYear());
        if (payrollRes) {
          // Response is a single payroll object for the specified period
          setEstimatedSalary(payrollRes?.luongThucNhan || payrollRes?.luongCoBan || 0);
        }
      } catch (payrollErr) {
        // 403/404/204 are expected when no payroll data exists for the current period
        if (payrollErr?.response?.status !== 403 && payrollErr?.response?.status !== 404) {
          console.warn('Failed to fetch payroll:', payrollErr);
        }
      }

      // Initialize form data for editing
      setFormData({
        hoTen: mergedData.hoTen || '',
        email: mergedData.email || '',
        sdt: mergedData.sdt || '',
        diaChi: mergedData.diaChi || ''
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Không thể tải thông tin cá nhân. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await profileService.updateProfile(formData);
      toast.success('Cập nhật thông tin thành công!');
      setEditing(false);
      // Callback to parent
      if (onProfileUpdate) {
        onProfileUpdate(formData);
      }
      // Reload profile to get updated data
      await loadProfile();
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error('Lỗi cập nhật thông tin');
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.warning('Vui lòng chọn file ảnh');
      return;
    }

    // Validate file size (max 2MB for better performance)
    if (file.size > 2 * 1024 * 1024) {
      toast.warning('Kích thước ảnh không được vượt quá 2MB');
      return;
    }

    try {
      setUploadingAvatar(true);

      // Compress and create preview
      const compressedDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            // Create canvas to resize image
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400;
            const MAX_HEIGHT = 400;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to base64 with quality compression
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.onerror = reject;
          img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Set preview immediately
      setAvatarPreview(compressedDataUrl);

      // Update profile with compressed avatar
      await profileService.updateProfile({ avatarUrl: compressedDataUrl });

      // Callback to parent to update dashboard header immediately
      if (onProfileUpdate) {
        onProfileUpdate({ avatarUrl: compressedDataUrl });
      }

      // Callback to refresh header avatar
      if (onAvatarChange) {
        onAvatarChange();
      }

      toast.success('Cập nhật avatar thành công!');

      // Reload to get latest data
      await loadProfile();
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      setAvatarPreview(null); // Reset preview on error
      toast.error('Lỗi upload avatar: ' + (err.response?.data?.message || err.message || 'Vui lòng thử lại'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      // Validate
      if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        toast.warning('Vui lòng điền đầy đủ thông tin');
        return;
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.warning('Mật khẩu mới không khớp');
        return;
      }
      if (passwordData.newPassword.length < 6) {
        toast.warning('Mật khẩu mới phải có ít nhất 6 ký tự');
        return;
      }

      await profileService.changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });

      toast.success('Đổi mật khẩu thành công!');
      setShowPasswordModal(false);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Failed to change password:', err);
      toast.error('Lỗi đổi mật khẩu: ' + (err.response?.data?.message || 'Mật khẩu cũ không đúng'));
    }
  };


  if (loading) {
    return (
      <div style={commonStyles.pageContainer}>
        <div style={{ textAlign: 'center', padding: spacing['6xl'] }}>
          <div style={{ fontSize: typography.xl, color: colors.textSecondary, marginBottom: spacing.lg }}>⏳ Đang tải thông tin cá nhân...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={commonStyles.pageContainer}>
        <div style={{ textAlign: 'center', padding: spacing['6xl'] }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: typography.xl, color: '#ef4444', marginBottom: spacing.lg }}>{error}</div>
          <button
            style={{
              background: colors.gradientPrimary,
              color: '#fff', border: 'none', borderRadius: spacing.lg, padding: `${spacing.md} ${spacing.xl}`,
              fontSize: typography.sm, fontWeight: typography.bold, cursor: 'pointer'
            }}
            onClick={loadProfile}
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
      background: glassMode ? 'transparent' : (commonStyles.pageContainer?.background || '#f0f2f5')
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: spacing['2xl'] }}>
          <div style={{ fontSize: typography.sm, color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: typography.semibold, textTransform: 'uppercase' }}>
            {breadcrumb}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={commonStyles.heading1}>
              {title}
            </h1>
            {allowEdit && (
              <div style={{ display: 'flex', gap: spacing.md }}>
                {editing && (
                  <button
                    style={{
                      background: 'linear-gradient(195deg, #66BB6A, #43A047)',
                      color: '#fff', border: 'none', borderRadius: spacing.lg, padding: `${spacing.md} ${spacing.xl}`,
                      fontSize: typography.sm, fontWeight: typography.bold, cursor: 'pointer',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                      transition: 'transform 0.2s'
                    }}
                    onClick={handleSave}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    💾 Lưu
                  </button>
                )}
                {editing && (
                  <button
                    style={{
                      background: 'linear-gradient(195deg, #ef5350, #e53935)',
                      color: '#fff', border: 'none', borderRadius: spacing.lg, padding: `${spacing.md} ${spacing.xl}`,
                      fontSize: typography.sm, fontWeight: typography.bold, cursor: 'pointer',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                      transition: 'transform 0.2s'
                    }}
                    onClick={() => {
                      setEditing(false);
                      // Reset form data to original employee data
                      setFormData({
                        hoTen: employee.hoTen || '',
                        email: employee.email || '',
                        sdt: employee.sdt || '',
                        diaChi: employee.diaChi || ''
                      });
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    ❌ Hủy
                  </button>
                )}
                {!editing && (
                  <button
                    style={{
                      background: colors.gradientPrimary,
                      color: '#fff', border: 'none', borderRadius: spacing.lg, padding: `${spacing.md} ${spacing.xl}`,
                      fontSize: typography.sm, fontWeight: typography.bold, cursor: 'pointer',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                      transition: 'transform 0.2s'
                    }}
                    onClick={() => setEditing(true)}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    ✏️ Chỉnh sửa
                  </button>
                )}
                {!editing && (
                  <button
                    style={{
                      background: 'linear-gradient(195deg, #FFA726, #FB8C00)',
                      color: '#fff', border: 'none', borderRadius: spacing.lg, padding: `${spacing.md} ${spacing.xl}`,
                      fontSize: typography.sm, fontWeight: typography.bold, cursor: 'pointer',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                      transition: 'transform 0.2s'
                    }}
                    onClick={() => setShowPasswordModal(true)}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    🔐 Đổi mật khẩu
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {employee ? (
          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
            {/* Avatar & Basic Info */}
            <div style={{
              ...(glassMode ? glassStyles.card : {
                background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0,0,0,0.02)'
              }),
              borderRadius: 16, padding: 24, gridColumn: '1/-1'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: 20,
                    background: avatarPreview || employee.avatarUrl
                      ? `url(${avatarPreview || employee.avatarUrl}) center/cover`
                      : 'linear-gradient(195deg, #42424a, #191919)',
                    color: '#fff', display: 'grid', placeItems: 'center',
                    fontSize: 32, boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                  }}>
                    {!avatarPreview && !employee.avatarUrl && '👤'}
                  </div>
                  {allowEdit && (
                    <>
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        style={{ display: 'none' }}
                      />
                      <label
                        htmlFor="avatar-upload"
                        style={{
                          position: 'absolute',
                          bottom: -6,
                          right: -6,
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'linear-gradient(195deg, #42a5f5, #1976d2)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: uploadingAvatar ? 'wait' : 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          border: '3px solid #fff',
                          transition: 'all 0.2s ease',
                          zIndex: 2
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                        }}
                        title="Thay đổi ảnh đại diện"
                      >
                        {uploadingAvatar ? (
                          <div style={{
                            width: 16, height: 16, border: '2px solid #fff',
                            borderTopColor: 'transparent', borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                        )}
                      </label>
                      <style>{`
                        @keyframes spin { to { transform: rotate(360deg); } }
                      `}</style>
                    </>
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: glassMode ? glassStyles.heading.color : '#344767' }}>
                    {employee.hoTen}
                  </h2>
                  <div style={{ fontSize: 14, color: glassMode ? '#2d3436' : '#7b809a', marginTop: 4 }}>
                    {userRole}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <span style={{
                      background: '#dcfce7', color: '#16a34a', padding: '6px 12px',
                      borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'inline-block'
                    }}>
                      🟢 Đang làm việc
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div style={{
              ...(glassMode ? glassStyles.card : {
                background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0,0,0,0.02)'
              }),
              borderRadius: 16, padding: 24
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#344767', marginBottom: 20 }}>
                Thông tin cá nhân
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: glassMode ? glassStyles.label.color : '#7b809a', marginBottom: 6, display: 'block' }}>
                    Họ và tên
                  </label>
                  {editing ? (
                    <input
                      name="hoTen"
                      value={formData.hoTen}
                      onChange={handleInputChange}
                      style={{
                        width: '100%', padding: 12, border: '1px solid #d2d6da', borderRadius: 8,
                        outline: 'none', fontSize: 14, boxSizing: 'border-box', color: '#344767',
                        ...(glassMode ? glassStyles.input : {})
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 15, color: glassMode ? '#2d3436' : '#344767', fontWeight: 500 }}>
                      {employee.hoTen}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#7b809a', marginBottom: 6, display: 'block' }}>
                    Email
                  </label>
                  {editing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      style={{
                        width: '100%', padding: 12, border: '1px solid #d2d6da', borderRadius: 8,
                        outline: 'none', fontSize: 14, boxSizing: 'border-box', color: '#344767'
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 15, color: '#344767', fontWeight: 500 }}>
                      {employee.email}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#7b809a', marginBottom: 6, display: 'block' }}>
                    Số điện thoại
                  </label>
                  {editing ? (
                    <input
                      name="sdt"
                      value={formData.sdt}
                      onChange={handleInputChange}
                      style={{
                        width: '100%', padding: 12, border: '1px solid #d2d6da', borderRadius: 8,
                        outline: 'none', fontSize: 14, boxSizing: 'border-box', color: '#344767'
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 15, color: '#344767', fontWeight: 500 }}>
                      {employee.sdt || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#7b809a', marginBottom: 6, display: 'block' }}>
                    Địa chỉ
                  </label>
                  {editing ? (
                    <input
                      name="diaChi"
                      value={formData.diaChi}
                      onChange={handleInputChange}
                      style={{
                        width: '100%', padding: 12, border: '1px solid #d2d6da', borderRadius: 8,
                        outline: 'none', fontSize: 14, boxSizing: 'border-box', color: '#344767'
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 15, color: '#344767', fontWeight: 500 }}>
                      {employee.diaChi}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Work Information */}
            <div style={{
              ...(glassMode ? glassStyles.card : {
                background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0,0,0,0.02)'
              }),
              borderRadius: 16, padding: 24
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#344767', marginBottom: 20 }}>
                Thông tin công việc
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: glassMode ? glassStyles.label.color : '#7b809a', marginBottom: 6, display: 'block' }}>
                    Phòng ban
                  </label>
                  <div style={{ fontSize: 15, color: glassMode ? '#2d3436' : '#344767', fontWeight: 500 }}>
                    {employee.tenPhongBan || 'Chưa cập nhật'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: glassMode ? glassStyles.label.color : '#7b809a', marginBottom: 6, display: 'block' }}>
                    Chức vụ
                  </label>
                  <div style={{ fontSize: 15, color: glassMode ? '#2d3436' : '#344767', fontWeight: 500 }}>
                    {employee.tenChucVu || 'Chưa cập nhật'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: glassMode ? glassStyles.label.color : '#7b809a', marginBottom: 6, display: 'block' }}>
                    Ngày vào làm
                  </label>
                  <div style={{ fontSize: 15, color: glassMode ? '#2d3436' : '#344767', fontWeight: 500 }}>
                    {employee.ngayVaoLam || 'Chưa cập nhật'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: glassMode ? glassStyles.label.color : '#7b809a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Lương cơ bản
                    <button
                      onClick={() => setShowSalary(!showSalary)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 16,
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        color: glassMode ? '#2d3436' : '#7b809a',
                        transition: 'color 0.2s'
                      }}
                      title={showSalary ? 'Ẩn lương' : 'Hiện lương'}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#344767'}
                      onMouseLeave={(e) => e.currentTarget.style.color = glassMode ? '#2d3436' : '#7b809a'}
                    >
                      {showSalary ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </label>
                  <div style={{ fontSize: 15, color: '#16a34a', fontWeight: 700 }}>
                    {showSalary ? (employee.luongCoBan ? formatCurrency(employee.luongCoBan) : 'Chưa cập nhật') : '***'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: glassMode ? glassStyles.label.color : '#7b809a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Lương ước tính (Tháng {new Date().getMonth() + 1})
                    <button
                      onClick={() => setShowEstimatedSalary(!showEstimatedSalary)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 16,
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        color: glassMode ? '#2d3436' : '#7b809a',
                        transition: 'color 0.2s'
                      }}
                      title={showEstimatedSalary ? 'Ẩn lương' : 'Hiện lương'}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#344767'}
                      onMouseLeave={(e) => e.currentTarget.style.color = glassMode ? '#2d3436' : '#7b809a'}
                    >
                      {showEstimatedSalary ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </label>
                  <div style={{ fontSize: 15, color: '#0ea5e9', fontWeight: 700 }}>
                    {showEstimatedSalary ? (estimatedSalary !== null ? formatCurrency(estimatedSalary) : 'Chưa có dữ liệu') : '***'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            background: '#fff', borderRadius: 16, padding: 60, textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>👤</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#344767', marginBottom: 12 }}>
              Chưa có thông tin nhân viên
            </div>
            <div style={{ fontSize: 14, color: '#7b809a', lineHeight: 1.6, marginBottom: 20 }}>
              Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên.
              Vui lòng liên hệ HR để cập nhật thông tin.
            </div>
            <div style={{
              fontSize: 14, color: '#344767', background: '#f8f9fa',
              padding: 12, borderRadius: 8, display: 'inline-block'
            }}>
              <strong>Tài khoản hiện tại:</strong> {username}
            </div>
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowPasswordModal(false)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32, maxWidth: 500, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#344767', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              🔐 Đổi mật khẩu
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#7b809a', marginBottom: 6, display: 'block' }}>
                  Mật khẩu cũ
                </label>
                <input
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, oldPassword: e.target.value }))}
                  style={{
                    width: '100%', padding: 12, border: '1px solid #d2d6da', borderRadius: 8,
                    outline: 'none', fontSize: 14, boxSizing: 'border-box'
                  }}
                  placeholder="Nhập mật khẩu cũ"
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#7b809a', marginBottom: 6, display: 'block' }}>
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  style={{
                    width: '100%', padding: 12, border: '1px solid #d2d6da', borderRadius: 8,
                    outline: 'none', fontSize: 14, boxSizing: 'border-box'
                  }}
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#7b809a', marginBottom: 6, display: 'block' }}>
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  style={{
                    width: '100%', padding: 12, border: '1px solid #d2d6da', borderRadius: 8,
                    outline: 'none', fontSize: 14, boxSizing: 'border-box'
                  }}
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                style={{
                  flex: 1,
                  background: 'linear-gradient(195deg, #66BB6A, #43A047)',
                  color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
                onClick={handleChangePassword}
              >
                💾 Lưu
              </button>
              <button
                style={{
                  flex: 1,
                  background: '#f8f9fa',
                  color: '#344767', border: '1px solid #d2d6da', borderRadius: 8, padding: '12px 24px',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer'
                }}
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

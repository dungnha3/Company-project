import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { leavesService } from '@/features/hr/shared/services';
import { usePermissions, useErrorHandler } from '@/shared/hooks';
import { useToast } from '@/shared/components/ui';

export default function SharedLeaveRequestPage({
  title = "Đơn từ & Nghỉ phép",
  breadcrumb = "Cá nhân / Nghỉ phép",
  viewMode = "personal",
  glassMode = false
}) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { user: authUser } = useAuth();
  const { user: currentUser, isHRManager, isProjectManager } = usePermissions();
  const { handleError } = useErrorHandler();
  const toast = useToast();

  const [createForm, setCreateForm] = useState({
    loaiPhep: 'PHEP_NAM',
    ngayBatDau: '',
    ngayKetThuc: '',
    lyDo: ''
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      setLoading(true);
      setError(null);

      if (viewMode === "personal" && currentUser?.userId) {
        // Get employee ID first
        const employeeRes = await import('@/features/hr/shared/services/employees.service').then(m => m.employeesService.getByUserId(currentUser.userId));
        const employeeId = employeeRes?.nhanvienId;

        if (employeeId) {
          const data = await import('@/shared/services/leave.service').then(m => m.leaveService.getByEmployee(employeeId));
          setLeaves(data || []);
        }
      } else if (viewMode === "management" && isHRManager) {
        // Management view - fetch all pending or all leaves
        // For now let's fetch all
        const data = await import('@/shared/services/leave.service').then(m => m.leaveService.getAll());
        setLeaves(data || []);
      }

      setLoading(false);
    } catch (err) {
      const errorMessage = handleError(err, { context: 'load_leaves' });
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCreateForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateLeave = async () => {
    if (!createForm.ngayBatDau || !createForm.ngayKetThuc || !createForm.lyDo.trim()) {
      toast.warning('Vui lòng nhập đủ thông tin');
      return;
    }

    try {
      // Get employee ID
      const employeeRes = await import('@/features/hr/shared/services/employees.service').then(m => m.employeesService.getByUserId(currentUser.userId));
      const employeeId = employeeRes?.nhanvienId;

      if (!employeeId) {
        toast.error('Không tìm thấy thông tin nhân viên');
        return;
      }

      const payload = {
        nhanVien: { nhanvienId: employeeId },
        loaiPhep: createForm.loaiPhep,
        ngayBatDau: createForm.ngayBatDau,
        ngayKetThuc: createForm.ngayKetThuc,
        lyDo: createForm.lyDo
      };

      await import('@/shared/services/leave.service').then(m => m.leaveService.create(payload));

      toast.success('Đã tạo đơn nghỉ phép thành công!');
      setShowCreateModal(false);
      setCreateForm({ loaiPhep: 'PHEP_NAM', ngayBatDau: '', ngayKetThuc: '', lyDo: '' });

      // Refresh list
      loadLeaves();

    } catch (err) {
      toast.error('Lỗi khi tạo đơn: ' + (err.response?.data?.message || err.message));
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      CHO_DUYET: { bg: '#fff7ed', color: '#c2410c', label: '⏳ Chờ duyệt' },
      DA_DUYET: { bg: '#f0fdf4', color: '#15803d', label: '✓ Đã duyệt' },
      TU_CHOI: { bg: '#fef2f2', color: '#b91c1c', label: '✗ Từ chối' }
    };
    const s = config[status] || config.CHO_DUYET;
    return (
      <span style={{
        background: s.bg, color: s.color, padding: '4px 8px', borderRadius: 6,
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap'
      }}>
        {s.label}
      </span>
    );
  };

  const getLeaveType = (type) => {
    const types = {
      PHEP_NAM: { label: 'Phép năm', icon: '🏖️' },
      OM: { label: 'Nghỉ ốm', icon: '💊' },
      KO_LUONG: { label: 'Không lương', icon: '💸' },
      KHAC: { label: 'Khác', icon: '📝' }
    };
    return types[type] || { label: type, icon: '📄' };
  };

  // Pagination calculations
  const totalPages = Math.ceil(leaves.length / itemsPerPage);
  const paginatedLeaves = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return leaves.slice(start, start + itemsPerPage);
  }, [leaves, currentPage]);

  if (loading) {
    return (
      <div style={{ padding: '24px 32px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 18, color: '#7b809a', marginBottom: 16 }}>Đang tải dữ liệu nghỉ phép...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px 32px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 18, color: '#ef4444', marginBottom: 16 }}>❌ Lỗi tải dữ liệu</div>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>{error}</div>
        </div>
      </div>
    );
  }

  // Glass Styles
  const glassStyles = glassMode ? {
    container: {
      background: 'transparent',
    },
    card: {
      background: 'rgba(255, 255, 255, 0.55)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.6)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
    }
  } : {};

  return (
    <div style={{ padding: '24px 32px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#7b809a', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>
          {breadcrumb}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#344767' }}>
            {title}
          </h1>
          {/* HR chỉ được xem, không được tạo đơn trong management view */}
          {!(isHRManager && viewMode === "management") && (
            <button
              style={{
                background: 'linear-gradient(195deg, #66bb6a, #43a047)',
                color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(67, 160, 71, 0.2)'
              }}
              onClick={() => setShowCreateModal(true)}
            >
              + Tạo đơn nghỉ phép
            </button>
          )}
          {/* HR management view - chỉ xem */}
          {isHRManager && viewMode === "management" && (
            <div style={{
              background: '#f8f9fa', color: '#6b7280', border: '1px solid #e5e7eb',
              borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600
            }}>
              👁️ Chỉ xem (HR không có quyền duyệt)
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 24 }}>
        {[
          { title: 'Tổng đơn', value: leaves.length, icon: '📋', color: '#3b82f6', bg: '#eff6ff' },
          { title: 'Chờ duyệt', value: leaves.filter(l => l.trangThai === 'CHO_DUYET').length, icon: '⏳', color: '#f59e0b', bg: '#fff7ed' },
          { title: 'Đã duyệt', value: leaves.filter(l => l.trangThai === 'DA_DUYET').length, icon: '✓', color: '#10b981', bg: '#f0fdf4' },
          { title: 'Từ chối', value: leaves.filter(l => l.trangThai === 'TU_CHOI').length, icon: '✗', color: '#ef4444', bg: '#fef2f2' }
        ].map((stat, i) => (
          <div key={i} style={{
            padding: 20, borderRadius: 16, border: '1px solid', borderColor: stat.color + '40',
            background: glassMode ? glassStyles.card.background : stat.bg,
            backdropFilter: glassMode ? glassStyles.card.backdropFilter : 'none',
            boxShadow: glassMode ? glassStyles.card.boxShadow : 'none',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#67748e', textTransform: 'uppercase' }}>
                {stat.title}
              </span>
              <span style={{ fontSize: 18, color: stat.color }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: glassMode ? glassStyles.card.background : '#fff',
        borderRadius: 16,
        boxShadow: glassMode ? glassStyles.card.boxShadow : '0 4px 20px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        border: glassMode ? glassStyles.card.border : '1px solid rgba(0,0,0,0.02)',
        backdropFilter: glassMode ? glassStyles.card.backdropFilter : 'none'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#7b809a', textTransform: 'uppercase', borderBottom: '1px solid #f0f2f5', background: glassMode ? 'rgba(255,255,255,0.3)' : 'transparent' }}>
                Loại phép
              </th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#7b809a', textTransform: 'uppercase', borderBottom: '1px solid #f0f2f5', background: glassMode ? 'rgba(255,255,255,0.3)' : 'transparent' }}>
                Thời gian
              </th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#7b809a', textTransform: 'uppercase', borderBottom: '1px solid #f0f2f5', background: glassMode ? 'rgba(255,255,255,0.3)' : 'transparent' }}>
                Lý do
              </th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#7b809a', textTransform: 'uppercase', borderBottom: '1px solid #f0f2f5', background: glassMode ? 'rgba(255,255,255,0.3)' : 'transparent' }}>
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 64, marginBottom: 20 }}>📋</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#344767', marginBottom: 12 }}>
                    Không có đơn nghỉ phép
                  </div>
                  <div style={{ fontSize: 14, color: '#7b809a' }}>
                    Chưa có đơn nghỉ phép nào được tạo
                  </div>
                </td>
              </tr>
            ) : (
              paginatedLeaves.map(leave => {
                const leaveType = getLeaveType(leave.loaiPhep);
                return (
                  <tr key={leave.nghiphepId} style={{ borderBottom: '1px solid #f0f2f5', background: glassMode ? 'rgba(255,255,255,0.2)' : 'transparent' }}>
                    <td style={{ padding: '16px 24px', fontSize: 14, verticalAlign: 'middle', color: '#344767' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16 }}>{leaveType.icon}</span>
                        <span style={{ fontWeight: 600 }}>{leaveType.label}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: 14, verticalAlign: 'middle', color: '#344767' }}>
                      <div>{leave.ngayBatDau} ➝ {leave.ngayKetThuc}</div>
                      <div style={{ fontSize: 12, color: '#7b809a', fontWeight: 600 }}>
                        {leave.soNgay} ngày
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: 14, verticalAlign: 'middle', color: '#344767' }}>
                      {leave.lyDo}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: 14, verticalAlign: 'middle', color: '#344767' }}>
                      {getStatusBadge(leave.trangThai)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #f0f2f5' }}>
            <div style={{ fontSize: 13, color: '#7b809a' }}>
              Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, leaves.length)} trên tổng {leaves.length}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  border: '1px solid #e2e8f0', background: 'white', padding: '6px 10px',
                  borderRadius: 6, cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  color: currentPage === 1 ? '#cbd5e1' : '#475569', display: 'flex'
                }}
              >
                ◀
              </button>

              {Array.from({ length: totalPages }, (_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  style={{
                    border: currentPage === idx + 1 ? 'none' : '1px solid #e2e8f0',
                    background: currentPage === idx + 1 ? '#3b82f6' : 'white',
                    color: currentPage === idx + 1 ? 'white' : '#475569',
                    width: 32, height: 32, borderRadius: 6, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {idx + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  border: '1px solid #e2e8f0', background: 'white', padding: '6px 10px',
                  borderRadius: 6, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  color: currentPage === totalPages ? '#cbd5e1' : '#475569', display: 'flex'
                }}
              >
                ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: 500, maxWidth: '95%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #f0f2f5',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#344767' }}>
                Tạo đơn nghỉ phép mới
              </h3>
              <button
                style={{ border: 'none', background: 'none', fontSize: 24, color: '#7b809a', cursor: 'pointer' }}
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#344767', marginBottom: 8, display: 'block' }}>
                  Loại phép <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  name="loaiPhep"
                  value={createForm.loaiPhep}
                  onChange={handleInputChange}
                  style={{
                    width: '100%', padding: 12, border: '1px solid #d2d6da', borderRadius: 8,
                    outline: 'none', fontSize: 14, boxSizing: 'border-box', color: '#344767'
                  }}
                >
                  <option value="PHEP_NAM">🏖️ Phép năm</option>
                  <option value="OM">💊 Nghỉ ốm</option>
                  <option value="KO_LUONG">💸 Không lương</option>
                  <option value="KHAC">📝 Khác</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#344767', marginBottom: 8, display: 'block' }}>
                    Từ ngày <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="date"
                    name="ngayBatDau"
                    value={createForm.ngayBatDau}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    style={{
                      width: '100%', padding: 12, border: '1px solid #d2d6da', borderRadius: 8,
                      outline: 'none', fontSize: 14, boxSizing: 'border-box', color: '#344767'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#344767', marginBottom: 8, display: 'block' }}>
                    Đến ngày <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="date"
                    name="ngayKetThuc"
                    value={createForm.ngayKetThuc}
                    onChange={handleInputChange}
                    min={createForm.ngayBatDau || new Date().toISOString().split('T')[0]}
                    style={{
                      width: '100%', padding: 12, border: '1px solid #d2d6da', borderRadius: 8,
                      outline: 'none', fontSize: 14, boxSizing: 'border-box', color: '#344767'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#344767', marginBottom: 8, display: 'block' }}>
                  Lý do nghỉ phép <span style={{ color: 'red' }}>*</span>
                </label>
                <textarea
                  name="lyDo"
                  value={createForm.lyDo}
                  onChange={handleInputChange}
                  placeholder="Nhập lý do nghỉ phép..."
                  rows={4}
                  style={{
                    width: '100%', padding: 12, border: '1px solid #d2d6da', borderRadius: 8,
                    outline: 'none', fontSize: 14, boxSizing: 'border-box', color: '#344767',
                    minHeight: 80, resize: 'vertical', fontFamily: 'inherit'
                  }}
                />
              </div>

              {createForm.ngayBatDau && createForm.ngayKetThuc && (
                <div style={{
                  background: '#f0fdf4', padding: 12, borderRadius: 8,
                  border: '1px solid #dcfce7', fontSize: 14, marginBottom: 16
                }}>
                  <strong>Số ngày nghỉ: </strong>
                  {Math.ceil((new Date(createForm.ngayKetThuc) - new Date(createForm.ngayBatDau)) / (1000 * 60 * 60 * 24)) + 1} ngày
                </div>
              )}
            </div>

            <div style={{
              padding: '16px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 12,
              borderTop: '1px solid #f0f2f5'
            }}>
              <button
                style={{
                  background: '#f0f2f5', color: '#7b809a', border: '1px solid #d2d6da',
                  borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}
                onClick={() => setShowCreateModal(false)}
              >
                Hủy
              </button>
              <button
                style={{
                  background: 'linear-gradient(195deg, #66bb6a, #43a047)', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(67, 160, 71, 0.2)'
                }}
                onClick={handleCreateLeave}
              >
                Tạo đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

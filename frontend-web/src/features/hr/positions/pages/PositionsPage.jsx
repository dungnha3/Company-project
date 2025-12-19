import { useState, useEffect, useMemo } from 'react';
import { positionsService } from '@/features/hr/shared/services';
import { usePermissions, useErrorHandler } from '@/shared/hooks';
import { validateRequired } from '@/shared/utils/validation';
import { useToast } from '@/shared/components/ui';
import Pagination from '@/shared/components/table/Pagination';

// Danh sách icon có thể chọn
const AVAILABLE_ICONS = ['💻', '🚀', '⚡', '👥', '📊', '📢', '💼', '🔧', '🛡️', '🎯', '🎓', '💎'];
const ITEMS_PER_PAGE = 9;

export default function PositionsPage({ glassMode = false }) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { isHRManager } = usePermissions();
  const { handleError } = useErrorHandler();
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await positionsService.getAll();
      setPositions(data);
    } catch (err) {
      const errorMessage = handleError(err, { context: 'load_positions' });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(positions.length / ITEMS_PER_PAGE);
  const paginatedPositions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return positions.slice(start, start + ITEMS_PER_PAGE);
  }, [positions, currentPage]);

  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [formData, setFormData] = useState({ tenChucVu: '', moTa: '', heSoLuong: 1.0, icon: '💼' });

  const handleAdd = () => {
    setEditingPosition(null);
    setFormData({ tenChucVu: '', moTa: '', heSoLuong: 1.0, icon: '💼' });
    setShowModal(true);
  };

  const handleEdit = (position) => {
    setEditingPosition(position);
    setFormData({
      tenChucVu: position.tenChucVu,
      moTa: position.moTa,
      heSoLuong: position.heSoLuong,
      icon: position.icon || '💼'
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    // Validation
    const nameError = validateRequired(formData.tenChucVu, 'Tên chức vụ');
    if (nameError) {
      toast.warning(nameError);
      return;
    }

    try {
      setLoading(true);
      if (editingPosition) {
        await positionsService.update(editingPosition.chucvuId, formData);
      } else {
        await positionsService.create(formData);
      }
      await loadData();
      setShowModal(false);
      toast.success(editingPosition ? 'Cập nhật chức vụ thành công!' : 'Thêm chức vụ thành công!');
    } catch (err) {
      const errorMessage = handleError(err, { context: editingPosition ? 'update_position' : 'create_position' });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc muốn xóa chức vụ này?')) {
      try {
        setLoading(true);
        await positionsService.delete(id);
        await loadData();
        toast.success('Xóa chức vụ thành công!');
      } catch (err) {
        const errorMessage = handleError(err, { context: 'delete_position' });
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  // Permission guard
  if (!isHRManager) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <div style={{ fontSize: '20px', fontWeight: '600', color: '#ef4444' }}>Không có quyền truy cập</div>
        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Chỉ HR Manager mới có quyền quản lý chức vụ</div>
      </div>
    );
  }

  // GLASS STYLES OVERRIDES
  const glassCardStyle = glassMode ? {
    background: 'rgba(255, 255, 255, 0.55)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
  } : {};

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.headerWrapper}>
        <div>
          <div style={s.breadcrumb}>Quản lý nhân sự / Chức vụ</div>
          <h1 style={s.pageTitle}>Danh sách Chức vụ</h1>
        </div>
        <button style={s.btnAdd} onClick={handleAdd}>
          <span style={{ marginRight: 6, fontSize: 18 }}>+</span> Thêm mới
        </button>
      </div>

      {/* Grid System */}
      <div style={s.grid}>
        {paginatedPositions.map(pos => (
          <div key={pos.chucvuId} style={{ ...s.card, ...glassCardStyle }}>
            <div style={s.cardTop}>
              <div style={s.iconBox}>
                {pos.icon || '💼'}
              </div>
              <div style={s.actionButtons}>
                <button style={s.iconBtn} onClick={() => handleEdit(pos)} title="Chỉnh sửa">
                  ✏️
                </button>
                <button style={{ ...s.iconBtn, color: '#ef4444', background: '#fef2f2' }} onClick={() => handleDelete(pos.chucvuId)} title="Xóa">
                  🗑️
                </button>
              </div>
            </div>

            <div style={s.cardContent}>
              <h3 style={s.positionName}>{pos.tenChucVu}</h3>
              <p style={s.positionDesc}>{pos.moTa}</p>

              {/* Stats Box */}
              <div style={s.statsContainer}>
                <div style={s.statCol}>
                  <span style={s.statLabel}>Hệ số lương</span>
                  <span style={s.statValue}>{pos.heSoLuong}</span>
                </div>
                <div style={s.dividerVertical}></div>
                <div style={s.statCol}>
                  <span style={s.statLabel}>Nhân sự</span>
                  <span style={s.statValue}>{pos.soLuongNhanVien || 0} <span style={{ fontSize: 12, color: '#adb5bd', fontWeight: 400 }}>/20</span></span>
                </div>
              </div>
            </div>

            {/* Progress Bar Footer */}
            <div style={s.cardFooter}>
              <div style={s.progressInfo}>
                <span style={s.progressLabel}>Chỉ tiêu nhân sự</span>
                <span style={s.progressPercent}>{Math.round(((pos.soLuongNhanVien || 0) / 20) * 100)}%</span>
              </div>
              <div style={s.progressBarBg}>
                <div style={{
                  ...s.progressBarFill,
                  width: `${Math.min(((pos.soLuongNhanVien || 0) / 20) * 100, 100)}%`,
                  background: (pos.soLuongNhanVien || 0) >= 20 ? '#4caf50' : 'linear-gradient(195deg, #fb8c00, #ffa726)'
                }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={s.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>{editingPosition ? 'Cập nhật chức vụ' : 'Thêm chức vụ mới'}</h2>
              <button style={s.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>

            <div style={s.modalBody}>
              {/* Icon Selection */}
              <div style={s.formGroup}>
                <label style={s.label}>Chọn biểu tượng</label>
                <div style={s.iconGrid}>
                  {AVAILABLE_ICONS.map((icon, idx) => (
                    <button
                      key={idx}
                      type="button"
                      style={{
                        ...s.iconOption,
                        ...(formData.icon === icon ? s.iconOptionActive : {})
                      }}
                      onClick={() => setFormData({ ...formData, icon })}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div style={s.row}>
                <div style={{ ...s.formGroup, flex: 2 }}>
                  <label style={s.label}>Tên chức vụ <span style={{ color: 'red' }}>*</span></label>
                  <input
                    style={s.input}
                    value={formData.tenChucVu}
                    onChange={(e) => setFormData({ ...formData, tenChucVu: e.target.value })}
                    placeholder="VD: Senior Developer"
                    autoFocus
                  />
                </div>

                <div style={{ ...s.formGroup, flex: 1 }}>
                  <label style={s.label}>Hệ số lương</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    style={s.input}
                    value={formData.heSoLuong}
                    onChange={(e) => setFormData({ ...formData, heSoLuong: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Mô tả công việc</label>
                <textarea
                  style={s.textarea}
                  value={formData.moTa}
                  onChange={(e) => setFormData({ ...formData, moTa: e.target.value })}
                  placeholder="Mô tả ngắn gọn về trách nhiệm..."
                />
              </div>
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnCancel} onClick={() => setShowModal(false)}>Đóng</button>
              <button style={s.btnSave} onClick={handleSave}>Lưu lại</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: {
    padding: '24px 32px',
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    color: '#344767',
    maxWidth: '100%',
    boxSizing: 'border-box'
  },
  // Header Section
  headerWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 32,
  },
  breadcrumb: {
    fontSize: 13,
    color: '#7b809a',
    marginBottom: 6,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
    color: '#344767',
    letterSpacing: '-0.5px'
  },
  btnAdd: {
    background: 'linear-gradient(195deg, #fb8c00, #ffa726)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 24px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(251, 140, 0, 0.2)',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    transition: 'transform 0.2s',
  },

  // Grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 24,
  },

  // Card Styles
  card: {
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid rgba(0,0,0,0.02)',
  },
  cardTop: {
    padding: '20px 20px 0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    background: 'linear-gradient(195deg, #fb8c00, #ffa726)',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    fontSize: 28,
    boxShadow: '0 4px 10px rgba(251, 140, 0, 0.3)',
    marginTop: -10
  },
  actionButtons: {
    display: 'flex',
    gap: 8,
  },
  // FIX: Căn giữa nút Sửa/Xóa
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    background: '#f8f9fa',
    cursor: 'pointer',
    display: 'flex',           // Sử dụng Flexbox thay vì Grid
    alignItems: 'center',      // Căn giữa dọc
    justifyContent: 'center',  // Căn giữa ngang
    padding: 0,                // Xóa padding mặc định của button
    fontSize: 14,
    color: '#7b809a',
    transition: 'all 0.2s'
  },

  // Card Content
  cardContent: {
    padding: '16px 24px',
  },
  positionName: {
    fontSize: 18,
    fontWeight: 700,
    margin: '0 0 8px 0',
    color: '#344767',
  },
  positionDesc: {
    fontSize: 14,
    color: '#7b809a',
    lineHeight: 1.5,
    margin: '0 0 20px 0',
    height: 42,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },

  // Stats
  statsContainer: {
    background: '#f8f9fa',
    borderRadius: 10,
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  statCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1
  },
  dividerVertical: {
    width: 1,
    height: 24,
    background: '#e9ecef'
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: '#7b809a',
    fontWeight: 700,
    marginBottom: 4
  },
  statValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#344767'
  },

  // Footer
  cardFooter: {
    padding: '16px 24px 24px 24px',
    marginTop: 'auto',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 600,
    color: '#7b809a'
  },
  progressPercent: {
    color: '#fb8c00'
  },
  progressBarBg: {
    height: 6,
    width: '100%',
    background: '#f0f2f5',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.5s ease-out'
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(3px)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    width: 500,
    maxWidth: '95%',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh'
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #f0f2f5',
    display: 'flex',
    justifyContent: 'space-between',
    flexShrink: 0
  },
  modalTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: '#344767' },
  closeBtn: { border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#7b809a' },
  modalBody: {
    padding: 24,
    overflowY: 'auto'
  },
  row: {
    display: 'flex',
    gap: 20,
    marginBottom: 20
  },
  formGroup: { marginBottom: 20 },
  label: { display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#344767' },

  // Input fix: ép màu nền trắng và box-sizing
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d2d6da',
    borderRadius: 8,
    outline: 'none',
    fontSize: 14,
    boxSizing: 'border-box',
    transition: 'all 0.2s',
    backgroundColor: '#ffffff', // Bắt buộc nền trắng
    color: '#344767'            // Bắt buộc chữ màu tối chuẩn
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d2d6da',
    borderRadius: 8,
    outline: 'none',
    minHeight: 100,
    resize: 'vertical',
    fontSize: 14,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff', // Bắt buộc nền trắng
    color: '#344767'
  },

  // FIX: Căn giữa icon trong ô chọn
  iconGrid: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 8
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: '1px solid #e9ecef',
    background: '#fff',
    fontSize: 20,
    cursor: 'pointer',
    display: 'flex',            // Flexbox căn chuẩn hơn
    alignItems: 'center',       // Căn giữa dọc
    justifyContent: 'center',   // Căn giữa ngang
    padding: 0,                 // Xóa padding thừa
    transition: 'all 0.2s',
    lineHeight: 1               // Đảm bảo icon không bị đẩy dòng
  },
  iconOptionActive: {
    background: 'linear-gradient(195deg, #fb8c00, #ffa726)',
    color: '#fff',
    borderColor: 'transparent',
    boxShadow: '0 4px 6px rgba(251, 140, 0, 0.2)',
    transform: 'scale(1.1)'
  },

  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #f0f2f5',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    flexShrink: 0
  },
  btnCancel: {
    padding: '10px 24px',
    border: 'none',
    background: '#f0f2f5',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
    color: '#7b809a'
  },
  btnSave: {
    padding: '10px 24px',
    border: 'none',
    background: 'linear-gradient(195deg, #fb8c00, #ffa726)',
    color: '#fff',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(251, 140, 0, 0.2)'
  }
};
import { useState, useMemo, useEffect } from 'react';
import { departmentsService, employeesService } from '@/features/hr/shared/services';
import { usePermissions, useErrorHandler } from '@/shared/hooks';
import { validateRequired } from '@/shared/utils/validation';
import { useToast } from '@/shared/components/ui';
import Pagination from '@/shared/components/table/Pagination';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState
} from '@/shared/components/ui';
import EmployeeDetailModal from '../components/EmployeeDetailModal';

const ITEMS_PER_PAGE = 9;

export default function DepartmentsPage({ glassMode = false }) {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // State cho modal xem nhân viên
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedDepartmentEmployees, setSelectedDepartmentEmployees] = useState([]);
  const [selectedDepartmentName, setSelectedDepartmentName] = useState('');

  // State cho modal chi tiết nhân viên
  const [showEmployeeDetailModal, setShowEmployeeDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const { isHRManager } = usePermissions();
  const { handleError } = useErrorHandler();
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [depts, emps] = await Promise.all([
        departmentsService.getAll(),
        employeesService.getAll()
      ]);
      setDepartments(depts);
      setEmployees(emps);
    } catch (err) {
      const errorMessage = handleError(err, { context: 'load_departments' });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    phongbanId: null,
    tenPhongBan: '',
    moTa: '',
    truongPhongId: ''
  });

  const filteredDepartments = useMemo(() => {
    return departments.filter(dept =>
      dept.tenPhongBan.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [departments, searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(filteredDepartments.length / ITEMS_PER_PAGE);
  const paginatedDepartments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDepartments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDepartments, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const stats = {
    totalDepts: departments.length,
    totalEmps: departments.reduce((acc, cur) => acc + (cur.soLuongNhanVien || 0), 0),
    noManager: departments.filter(d => !d.tenTruongPhong).length
  };

  const handleAddNew = () => {
    setIsEditing(false);
    setFormData({ phongbanId: null, tenPhongBan: '', moTa: '', truongPhongId: '' });
    setShowModal(true);
  };

  const handleEdit = (dept) => {
    setIsEditing(true);
    setFormData({
      phongbanId: dept.phongbanId,
      tenPhongBan: dept.tenPhongBan,
      moTa: dept.moTa,
      truongPhongId: dept.truongPhongId || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa phòng ban này?')) {
      try {
        setLoading(true);
        await departmentsService.delete(id);
        await loadData();
        toast.success('Xóa phòng ban thành công!');
      } catch (err) {
        const errorMessage = handleError(err, { context: 'delete_department' });
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  // Xử lý xem danh sách nhân viên
  const handleViewEmployees = (dept) => {
    const deptEmployees = employees.filter(emp =>
      emp.phongbanId === dept.phongbanId ||
      (emp.phongban && emp.phongban.phongbanId === dept.phongbanId)
    );
    setSelectedDepartmentEmployees(deptEmployees);
    setSelectedDepartmentName(dept.tenPhongBan);
    setShowEmployeeModal(true);
  };

  // Xử lý xem chi tiết nhân viên
  const handleViewEmployeeDetail = (emp) => {
    setSelectedEmployee(emp);
    setShowEmployeeDetailModal(true);
  };

  // Helper để hiển thị badge trạng thái
  const getStatusBadge = (status) => {
    const config = {
      DANG_LAM_VIEC: { color: '#16a34a', bg: '#dcfce7', text: 'Đang làm' },
      NGHI_VIEC: { color: '#dc2626', bg: '#fee2e2', text: 'Nghỉ việc' },
      TAM_NGHI: { color: '#d97706', bg: '#fef3c7', text: 'Tạm nghỉ' }
    };
    const style = config[status] || config.DANG_LAM_VIEC;
    return (
      <span style={{
        background: style.bg, color: style.color,
        padding: '4px 8px', borderRadius: '6px',
        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
        display: 'inline-block', whiteSpace: 'nowrap'
      }}>
        {style.text}
      </span>
    );
  };

  const handleSubmit = async () => {
    // Validation
    const nameError = validateRequired(formData.tenPhongBan, 'Tên phòng ban');
    if (nameError) return toast.warning(nameError);

    try {
      setLoading(true);
      if (isEditing) {
        await departmentsService.update(formData.phongbanId, formData);
      } else {
        await departmentsService.create(formData);
      }
      await loadData();
      setShowModal(false);
      toast.success(isEditing ? 'Cập nhật phòng ban thành công!' : 'Thêm phòng ban thành công!');
    } catch (err) {
      const errorMessage = handleError(err, { context: isEditing ? 'update_department' : 'create_department' });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Permission guard
  if (!isHRManager) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <div style={{ fontSize: '20px', fontWeight: '600', color: '#ef4444' }}>Không có quyền truy cập</div>
        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Chỉ HR Manager mới có quyền quản lý phòng ban</div>
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

  const glassInputStyle = glassMode ? {
    background: 'rgba(255, 255, 255, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.6)'
  } : {};

  return (
    <div style={s.container}>
      <div style={s.headerWrapper}>
        <div>
          <div style={s.breadcrumb}>Quản lý nhân sự / Phòng ban</div>
          <h1 style={s.pageTitle}>Quản lý Phòng Ban</h1>
        </div>
        <button style={s.btnAdd} onClick={handleAddNew}>
          <span style={{ marginRight: 6 }}>+</span> Thêm mới
        </button>
      </div>

      <div style={s.statsGrid}>
        <StatCard title="Tổng phòng ban" value={stats.totalDepts} icon="🏢" color="#3b82f6" glassMode={glassMode} glassStyle={glassCardStyle} />
        <StatCard title="Tổng nhân sự" value={stats.totalEmps} icon="👥" color="#10b981" glassMode={glassMode} glassStyle={glassCardStyle} />
        <StatCard title="Chưa có trưởng phòng" value={stats.noManager} icon="⚠️" color="#f59e0b" glassMode={glassMode} glassStyle={glassCardStyle} />
      </div>

      <div style={s.searchBar}>
        <div style={s.searchWrapper}>
          <span style={s.searchIcon}>🔍</span>
          <input
            style={s.searchInput}
            placeholder="Tìm kiếm phòng ban..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div style={s.grid}>
        {paginatedDepartments.map(dept => (
          <div
            key={dept.phongbanId}
            style={{ ...s.card, ...glassCardStyle, cursor: 'pointer' }}
            onClick={() => handleViewEmployees(dept)}
          >
            <div style={s.cardHeader}>
              <div style={s.iconBox}>🏢</div>
              <div style={s.actionMenu} onClick={e => e.stopPropagation()}>
                <button style={s.iconBtn} onClick={() => handleEdit(dept)}>✏️</button>
                <button style={{ ...s.iconBtn, color: '#ef4444' }} onClick={() => handleDelete(dept.phongbanId)}>🗑️</button>
              </div>
            </div>

            <h3 style={s.deptName}>{dept.tenPhongBan}</h3>
            <p style={s.deptDesc}>{dept.moTa}</p>

            <div style={s.divider} />

            <div style={s.cardInfo}>
              <div style={s.infoItem}>
                <span style={s.infoLabel}>Trưởng phòng</span>
                {dept.tenTruongPhong ? (
                  <div style={s.managerBox}>
                    <div style={s.managerAvatar}>{dept.tenTruongPhong.charAt(0)}</div>
                    <span style={s.managerName}>{dept.tenTruongPhong}</span>
                  </div>
                ) : (
                  <span style={s.noManager}>Chưa bổ nhiệm</span>
                )}
              </div>

              <div style={s.infoItem}>
                <span style={s.infoLabel}>Nhân sự</span>
                <div style={s.empCountBadge}>
                  👥 {dept.soLuongNhanVien || 0}
                </div>
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

      {/* MODAL XEM NHÂN VIÊN */}
      {showEmployeeModal && (
        <div style={s.modalOverlay} onClick={() => setShowEmployeeModal(false)}>
          <div style={{ ...s.modal, width: '900px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>
                Danh sách nhân viên - {selectedDepartmentName}
                <span style={{ fontSize: 14, fontWeight: 400, color: '#7b809a', marginLeft: 10 }}>
                  ({selectedDepartmentEmployees.length} nhân sự)
                </span>
              </h3>
              <button style={s.closeBtn} onClick={() => setShowEmployeeModal(false)}>×</button>
            </div>

            <div style={{ ...s.modalBody, maxHeight: '70vh', overflowY: 'auto', padding: 0 }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead width="35%">Nhân viên</TableHead>
                    <TableHead width="25%">Liên hệ</TableHead>
                    <TableHead width="20%">Vị trí</TableHead>
                    <TableHead width="20%">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDepartmentEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <EmptyState
                          icon="👥"
                          title="Chưa có nhân viên"
                          message="Phòng ban này chưa có nhân viên nào"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedDepartmentEmployees.map(emp => (
                      <TableRow key={emp.nhanvienId} style={{ cursor: 'pointer' }} onClick={() => handleViewEmployeeDetail(emp)}>
                        <TableCell>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10,
                              background: 'linear-gradient(195deg, #42424a, #191919)',
                              color: '#fff', display: 'grid', placeItems: 'center',
                              fontSize: 16, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}>
                              {emp.avatar || '👤'}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, color: '#1e40af' }}>{emp.hoTen}</div>
                              <div style={{ fontSize: 12, color: '#7b809a' }}>
                                {emp.maNhanVien || `NV${emp.nhanvienId}`}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, color: '#344767' }}>
                              📧 {emp.email || '---'}
                            </span>
                            <span style={{ fontSize: 13, color: '#7b809a' }}>
                              📞 {emp.sdt || '---'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div style={{ fontSize: 13, color: '#344767' }}>
                            {emp.tenChucVu || emp.chucvu?.tenChucVu || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(emp.trangThai)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnCancel} onClick={() => setShowEmployeeModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM ADD/EDIT */}
      {showModal && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{isEditing ? 'Cập nhật Phòng ban' : 'Thêm Phòng ban mới'}</h3>
              <button style={s.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.formGroup}>
                <label style={s.label}>Tên phòng ban <span style={{ color: 'red' }}>*</span></label>
                <input
                  style={s.input}
                  value={formData.tenPhongBan}
                  onChange={e => setFormData({ ...formData, tenPhongBan: e.target.value })}
                  placeholder="VD: Phòng Marketing"
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Mô tả</label>
                <textarea
                  style={s.textarea}
                  value={formData.moTa}
                  onChange={e => setFormData({ ...formData, moTa: e.target.value })}
                  placeholder="Mô tả chức năng, nhiệm vụ..."
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Trưởng phòng</label>
                <select
                  style={s.select}
                  value={formData.truongPhongId}
                  onChange={e => setFormData({ ...formData, truongPhongId: e.target.value })}
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map(e => (
                    <option key={e.nhanvienId} value={e.nhanvienId}>{e.hoTen}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={s.modalFooter}>
              <button style={s.btnCancel} onClick={() => setShowModal(false)}>Hủy</button>
              <button style={s.btnSave} onClick={handleSubmit}>Lưu lại</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT NHÂN VIÊN */}
      {showEmployeeDetailModal && selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => {
            setShowEmployeeDetailModal(false);
            setSelectedEmployee(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color, glassMode, glassStyle }) {
  return (
    <div style={{ ...s.statCard, ...(glassMode ? glassStyle : {}) }}>
      <div>
        <div style={s.statTitle}>{title}</div>
        <div style={{ ...s.statValue, color }}>{value}</div>
      </div>
      <div style={{ ...s.statIcon, color, background: `${color}15` }}>{icon}</div>
    </div>
  );
}

const s = {
  container: {
    padding: '24px 32px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#344767',
    boxSizing: 'border-box'
  },
  headerWrapper: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24
  },
  breadcrumb: {
    fontSize: 13, color: '#7b809a', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase'
  },
  pageTitle: {
    fontSize: 28, fontWeight: 700, margin: 0, color: '#344767'
  },
  btnAdd: {
    background: 'linear-gradient(195deg, #fb8c00, #ffa726)',
    color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(251, 140, 0, 0.2)', display: 'flex', alignItems: 'center'
  },

  statsGrid: {
    display: 'flex', gap: 20, marginBottom: 24
  },
  statCard: {
    flex: 1, background: '#fff', borderRadius: 12, padding: 20,
    boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  statTitle: { fontSize: 13, color: '#7b809a', fontWeight: 600, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: 700 },
  statIcon: { width: 48, height: 48, borderRadius: 12, display: 'grid', placeItems: 'center', fontSize: 24 },

  searchBar: { marginBottom: 24 },
  searchWrapper: {
    position: 'relative', maxWidth: 400, display: 'flex', alignItems: 'center'
  },
  searchIcon: { position: 'absolute', left: 12, color: '#7b809a' },
  searchInput: {
    width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #d2d6da',
    borderRadius: 8, outline: 'none', fontSize: 14, boxSizing: 'border-box',
    color: '#344767', background: '#fff'
  },

  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24
  },
  card: {
    background: '#fff', borderRadius: 16, padding: 24,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
    border: '1px solid rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column'
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 12,
    background: 'linear-gradient(195deg, #42424a, #191919)',
    color: '#fff', display: 'grid', placeItems: 'center', fontSize: 24,
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
  },
  actionMenu: { display: 'flex', gap: 8 },
  iconBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontSize: 16, color: '#7b809a', padding: 4
  },
  deptName: { fontSize: 18, fontWeight: 700, color: '#344767', margin: '0 0 8px 0' },
  deptDesc: { fontSize: 13, color: '#7b809a', lineHeight: 1.5, height: 40, overflow: 'hidden', marginBottom: 16 },
  divider: { height: 1, background: '#f0f2f5', marginBottom: 16 },

  cardInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: 6 },
  infoLabel: { fontSize: 11, textTransform: 'uppercase', color: '#7b809a', fontWeight: 700 },

  managerBox: { display: 'flex', alignItems: 'center', gap: 8 },
  managerAvatar: {
    width: 24, height: 24, borderRadius: '50%', background: '#3b82f6', color: '#fff',
    fontSize: 12, display: 'grid', placeItems: 'center', fontWeight: 600
  },
  managerName: { fontSize: 14, fontWeight: 600, color: '#344767' },
  noManager: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic' },

  empCountBadge: {
    background: '#f0fdf4', color: '#166534', padding: '4px 10px',
    borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid #dcfce7'
  },

  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modal: {
    background: '#fff', borderRadius: 16, width: 500, maxWidth: '95%',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: 24
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: '#344767' },
  closeBtn: { border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#7b809a' },

  modalBody: { display: 'flex', flexDirection: 'column', gap: 16 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 14, fontWeight: 600, color: '#344767' },

  // FIX: Thêm màu chữ và nền rõ ràng cho Input/Select
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d2d6da',
    outline: 'none', fontSize: 14, color: '#344767', background: '#fff', boxSizing: 'border-box'
  },
  textarea: {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d2d6da',
    outline: 'none', fontSize: 14, minHeight: 80, resize: 'vertical',
    color: '#344767', background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box'
  },
  select: {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d2d6da',
    outline: 'none', fontSize: 14, color: '#344767', background: '#fff',
    cursor: 'pointer', boxSizing: 'border-box'
  },

  modalFooter: {
    marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #f0f2f5'
  },
  btnCancel: {
    padding: '10px 20px', borderRadius: 8, border: 'none', background: '#f0f2f5',
    color: '#7b809a', fontWeight: 600, cursor: 'pointer'
  },
  btnSave: {
    padding: '10px 24px', borderRadius: 8, border: 'none',
    background: 'linear-gradient(195deg, #fb8c00, #ffa726)', color: '#fff',
    fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  }
};
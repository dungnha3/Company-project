import { useState, useMemo, useEffect } from 'react';
import { leavesService } from '@/features/hr/shared/services';
import { usePermissions, useErrorHandler } from '@/shared/hooks';
import { useToast } from '@/shared/components/ui';
import { validateRequired } from '@/shared/utils/validation';
import {
  PageContainer,
  PageHeader,
  PageTitle,
  Breadcrumb,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  FormGroup,
  FormLabel,
  FormInput,
  FormSelect,
  FormTextarea,
  LoadingState,
  ErrorState,
  EmptyState,
  IconButton
} from '@/shared/components/ui';

// --- ICONS (SVG) ---
const IconClock = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const IconCheck = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const IconX = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IconCalendar = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const IconSearch = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const IconChevronLeft = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
const IconChevronRight = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;

export default function LeavesPage({ glassMode = false }) {
  // --- STATE ---
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Số dòng mỗi trang

  const { isProjectManager, isHRManager } = usePermissions();
  const { handleError } = useErrorHandler();
  const toast = useToast();

  const canApprove = isProjectManager;
  const isReadOnly = isHRManager && !isProjectManager;

  // Modal State
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    nhanvienId: '', loaiPhep: 'PHEP_NAM', ngayBatDau: '', ngayKetThuc: '', lyDo: ''
  });

  // --- EFFECT ---
  useEffect(() => {
    fetchLeavesData();
  }, []);

  // Reset về trang 1 khi filter thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm]);

  const fetchLeavesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await leavesService.getAll();
      setLeaves(data || []);
    } catch (err) {
      const errorMessage = handleError(err, { context: 'load_leaves' });
      setError(errorMessage);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC FILTER & PAGINATION ---
  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      const matchStatus = filterStatus === 'ALL' || l.trangThai === filterStatus;
      const matchSearch = l.hoTenNhanVien?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [leaves, filterStatus, searchTerm]);

  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
  const paginatedLeaves = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeaves.slice(start, start + itemsPerPage);
  }, [filteredLeaves, currentPage]);

  const stats = {
    choDuyet: leaves.filter(l => l.trangThai === 'CHO_DUYET').length,
    daDuyet: leaves.filter(l => l.trangThai === 'DA_DUYET').length,
    tuChoi: leaves.filter(l => l.trangThai === 'TU_CHOI').length,
    tongNgayPhep: leaves.filter(l => l.trangThai === 'DA_DUYET').reduce((acc, curr) => acc + (curr.soNgay || 0), 0)
  };

  // --- ACTIONS ---
  const handleAction = async (action) => {
    if (!selectedLeave) return;
    if (action === 'REJECT' && validateRequired(approvalNote, 'Lý do từ chối')) {
      toast.warning('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      if (action === 'APPROVE') {
        await leavesService.approve(selectedLeave.nghiphepId, approvalNote || 'Approved');
        toast.success('Đã duyệt đơn!');
      } else {
        await leavesService.reject(selectedLeave.nghiphepId, approvalNote);
        toast.success('Đã từ chối đơn!');
      }
      fetchLeavesData();
      setSelectedLeave(null);
      setApprovalNote('');
    } catch (err) {
      toast.error(handleError(err));
    }
  };

  const handleCreateLeave = async () => {
    if (!createForm.nhanvienId || !createForm.ngayBatDau || !createForm.ngayKetThuc) {
      toast.warning('Thiếu thông tin bắt buộc');
      return;
    }
    try {
      await leavesService.create({ ...createForm, nhanvienId: Number(createForm.nhanvienId) });
      setShowCreateModal(false);
      setCreateForm({ nhanvienId: '', loaiPhep: 'PHEP_NAM', ngayBatDau: '', ngayKetThuc: '', lyDo: '' });
      fetchLeavesData();
      toast.success('Đã tạo đơn thành công');
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
  };

  // --- HELPER FUNCTIONS ---
  // Tạo màu ngẫu nhiên dựa trên tên (Consistent Color Hashing)
  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  const getAvatarStyle = (name) => {
    const bg = stringToColor(name || 'User');
    return {
      width: 40, height: 40, borderRadius: '50%',
      background: `${bg}25`, // Thêm độ trong suốt
      color: bg, // Màu chữ đậm hơn màu nền
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 700, border: `1px solid ${bg}40`
    };
  };

  const getStatusBadge = (status) => {
    const config = {
      CHO_DUYET: { bg: '#fff7ed', color: '#c2410c', icon: <IconClock size={14} />, label: 'Chờ duyệt' },
      DA_DUYET: { bg: '#f0fdf4', color: '#15803d', icon: <IconCheck size={14} />, label: 'Đã duyệt' },
      TU_CHOI: { bg: '#fef2f2', color: '#b91c1c', icon: <IconX size={14} />, label: 'Từ chối' },
    };
    const s = config[status] || config.CHO_DUYET;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: s.bg, color: s.color,
        padding: '6px 12px', borderRadius: '6px',
        fontSize: '12px', fontWeight: 600
      }}>
        {s.icon} {s.label}
      </span>
    );
  };

  const getLeaveType = (type) => {
    const map = {
      PHEP_NAM: { label: 'Phép năm', color: '#3b82f6' },
      OM: { label: 'Nghỉ ốm', color: '#ef4444' },
      KO_LUONG: { label: 'Không lương', color: '#6b7280' },
      KHAC: { label: 'Khác', color: '#8b5cf6' }
    };
    return map[type] || { label: type, color: '#6b7280' };
  };

  // Glass Styles
  const glassStyles = glassMode ? {
    card: {
      background: 'rgba(255, 255, 255, 0.55)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.6)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
    },
    header: {
      background: 'transparent',
      borderBottom: '1px solid rgba(255, 255, 255, 0.6)'
    },
    tableHeader: {
      background: 'rgba(255, 255, 255, 0.3)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.6)'
    }
  } : {};

  // --- COMPONENTS ---
  const ModernStatCard = ({ title, value, icon, iconColor }) => (
    <div style={{
      background: glassMode ? glassStyles.card.background : 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: glassMode ? glassStyles.card.boxShadow : '0 2px 10px rgba(0,0,0,0.03)',
      border: glassMode ? glassStyles.card.border : '1px solid #f1f5f9',
      backdropFilter: glassMode ? glassStyles.card.backdropFilter : 'none',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    }}>
      <div>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{title}</p>
        <h3 style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>{value}</h3>
      </div>
      <div style={{
        width: 48, height: 48, borderRadius: '12px', background: `${iconColor}15`,
        color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {icon}
      </div>
    </div>
  );

  if (loading) return <PageContainer><LoadingState message="Đang tải..." /></PageContainer>;
  if (error) return <PageContainer><ErrorState message={error} onRetry={fetchLeavesData} /></PageContainer>;

  return (
    <PageContainer>
      {/* 1. HEADER */}
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Breadcrumb style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Quản lý nhân sự / Nghỉ phép</Breadcrumb>
          <PageTitle style={{ color: '#0f172a', fontSize: 24 }}>Quản lý Đơn Nghỉ Phép</PageTitle>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          style={{
            borderRadius: '8px', padding: '10px 24px', fontWeight: 600,
            background: '#3b82f6', border: 'none', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
          }}
        >
          + Tạo đơn mới
        </Button>
      </div>

      {/* 2. STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 32 }}>
        <ModernStatCard title="Chờ phê duyệt" value={stats.choDuyet} icon={<IconClock size={24} />} iconColor="#f59e0b" />
        <ModernStatCard title="Đã duyệt (Tháng)" value={stats.daDuyet} icon={<IconCheck size={24} />} iconColor="#10b981" />
        <ModernStatCard title="Đã từ chối" value={stats.tuChoi} icon={<IconX size={24} />} iconColor="#ef4444" />
        <ModernStatCard title="Tổng ngày nghỉ" value={stats.tongNgayPhep} icon={<IconCalendar size={24} />} iconColor="#3b82f6" />
      </div>

      {/* 3. MAIN CARD (CONTAINER CHUNG CHO FILTER & TABLE) */}
      <div style={{
        background: glassMode ? glassStyles.card.background : 'white',
        borderRadius: '16px',
        border: glassMode ? glassStyles.card.border : '1px solid #e2e8f0',
        backdropFilter: glassMode ? glassStyles.card.backdropFilter : 'none',
        boxShadow: glassMode ? glassStyles.card.boxShadow : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden'
      }}>

        {/* FILTER BAR - GỌN GÀNG HƠN */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          background: glassMode ? 'transparent' : '#ffffff'
        }}>
          {/* Segmented Control Style Tabs */}
          <div style={{ background: '#f1f5f9', padding: 4, borderRadius: 8, display: 'flex', gap: 2 }}>
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'CHO_DUYET', label: 'Chờ duyệt' },
              { id: 'DA_DUYET', label: 'Đã duyệt' },
              { id: 'TU_CHOI', label: 'Từ chối' }
            ].map(tab => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  style={{
                    border: 'none',
                    background: isActive ? 'white' : 'transparent',
                    color: isActive ? '#0f172a' : '#64748b',
                    padding: '8px 16px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: 260 }}>
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
              <IconSearch />
            </div>
            <input
              placeholder="Tìm nhân viên..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px 10px 40px', borderRadius: 8,
                border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
                background: '#f8fafc', color: '#334155'
              }}
            />
          </div>
        </div>

        {/* TABLE - FIXED LAYOUT ĐỂ CỘT ĐỒNG ĐỀU */}
        <Table style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: '18%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '23%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '12%' }} />
          </colgroup>
          <TableHeader>
            <TableRow style={{ background: glassMode ? glassStyles.tableHeader.background : '#f8fafc', borderBottom: glassMode ? glassStyles.tableHeader.borderBottom : '1px solid #e2e8f0' }}>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>NHÂN VIÊN</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>THỜI GIAN</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>LOẠI PHÉP</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>LÝ DO</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>TRẠNG THÁI</TableHead>
              <TableHead style={{ padding: '14px 16px', textAlign: 'center' }}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLeaves.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" style={{ padding: 48 }}>
                  <EmptyState icon="📋" title="Không có dữ liệu" message="Không tìm thấy đơn nghỉ phép nào" />
                </TableCell>
              </TableRow>
            ) : (
              paginatedLeaves.map(leave => {
                const typeInfo = getLeaveType(leave.loaiPhep);
                return (
                  <TableRow key={leave.nghiphepId} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s', background: glassMode ? 'rgba(255,255,255,0.2)' : 'transparent' }}>

                    {/* Cột Nhân viên */}
                    <TableCell style={{ padding: '16px', textAlign: 'left', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10 }}>
                        {leave.avatarUrl ? (
                          <img src={leave.avatarUrl} alt="Avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={getAvatarStyle(leave.hoTenNhanVien)}>
                            {leave.hoTenNhanVien ? leave.hoTenNhanVien.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{leave.hoTenNhanVien}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{leave.chucVu}</div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Cột Thời gian */}
                    <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 13, color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {new Date(leave.ngayBatDau).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          <span style={{ color: '#94a3b8', fontSize: 10 }}>➜</span>
                          {new Date(leave.ngayKetThuc).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, width: 'fit-content' }}>
                          {leave.soNgay} ngày
                        </span>
                      </div>
                    </TableCell>

                    {/* Cột Loại phép */}
                    <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span style={{ color: typeInfo.color, fontWeight: 600, fontSize: 13 }}>{typeInfo.label}</span>
                    </TableCell>

                    {/* Cột Lý do */}
                    <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{
                        maxWidth: 280, // Tăng max-width để text dài hơn
                        whiteSpace: 'nowrap', overflow: 'hidden',
                        textOverflow: 'ellipsis', color: '#475569', fontSize: 13,
                        lineHeight: 1.5
                      }} title={leave.lyDo}>
                        {leave.lyDo}
                      </div>
                    </TableCell>

                    {/* Cột Trạng thái */}
                    <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      {getStatusBadge(leave.trangThai)}
                    </TableCell>

                    {/* Cột Action */}
                    <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div
                        onClick={() => { setSelectedLeave(leave); setApprovalNote(leave.ghiChuDuyet || ''); }}
                        title="Xem chi tiết"
                        style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: 'white', border: '1px solid #e2e8f0',
                          color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', transition: 'all 0.2s',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f8fafc';
                          e.currentTarget.style.color = '#3b82f6';
                          e.currentTarget.style.borderColor = '#3b82f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.color = '#64748b';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* 4. PAGINATION FOOTER */}
        {filteredLeaves.length > 0 && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: glassMode ? 'transparent' : '#ffffff'
          }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Hiển thị <b>{(currentPage - 1) * itemsPerPage + 1}</b> - <b>{Math.min(currentPage * itemsPerPage, filteredLeaves.length)}</b> trên tổng <b>{filteredLeaves.length}</b>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  border: '1px solid #e2e8f0', background: 'white', padding: '6px 10px',
                  borderRadius: 6, cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  color: currentPage === 1 ? '#cbd5e1' : '#475569', display: 'flex'
                }}
              >
                <IconChevronLeft />
              </button>

              {/* Page Numbers */}
              {[...Array(totalPages)].map((_, idx) => (
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
                <IconChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL VIEW / APPROVE (Giữ nguyên logic cũ nhưng style nhẹ) */}
      {selectedLeave && (
        <Modal isOpen={true} onClose={() => setSelectedLeave(null)}>
          <ModalHeader onClose={() => setSelectedLeave(null)}>
            <ModalTitle>Chi tiết Đơn nghỉ phép</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 20, borderBottom: '1px solid #f1f5f9', marginBottom: 20 }}>
              {selectedLeave.avatarUrl ? (
                <img src={selectedLeave.avatarUrl} alt="Avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ ...getAvatarStyle(selectedLeave.hoTenNhanVien), width: 56, height: 56, fontSize: 20 }}>
                  {selectedLeave.hoTenNhanVien ? selectedLeave.hoTenNhanVien.charAt(0) : 'U'}
                </div>
              )}
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{selectedLeave.hoTenNhanVien}</div>
                <div style={{ fontSize: 14, color: '#64748b' }}>{selectedLeave.chucVu}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>{getStatusBadge(selectedLeave.trangThai)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              {[
                { label: 'Loại nghỉ phép', val: getLeaveType(selectedLeave.loaiPhep).label },
                { label: 'Tổng số ngày', val: `${selectedLeave.soNgay} ngày` },
                { label: 'Bắt đầu', val: new Date(selectedLeave.ngayBatDau).toLocaleDateString('vi-VN') },
                { label: 'Kết thúc', val: new Date(selectedLeave.ngayKetThuc).toLocaleDateString('vi-VN') }
              ].map((item, idx) => (
                <div key={idx}>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 15, color: '#334155', fontWeight: 500 }}>{item.val}</div>
                </div>
              ))}
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Lý do nghỉ</div>
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, color: '#334155', fontSize: 14, border: '1px solid #e2e8f0' }}>{selectedLeave.lyDo}</div>
              </div>
            </div>

            {selectedLeave.trangThai === 'CHO_DUYET' && canApprove ? (
              <div style={{ background: '#fff7ed', padding: 20, borderRadius: 12, border: '1px solid #fed7aa' }}>
                <FormGroup>
                  <FormLabel>Ghi chú duyệt / Lý do từ chối</FormLabel>
                  <FormTextarea placeholder="Nhập ghi chú..." value={approvalNote} onChange={e => setApprovalNote(e.target.value)} style={{ background: 'white' }} />
                </FormGroup>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                  <Button variant="danger" onClick={() => handleAction('REJECT')}>Từ chối</Button>
                  <Button variant="success" onClick={() => handleAction('APPROVE')}>Phê duyệt</Button>
                </div>
              </div>
            ) : null}
          </ModalBody>
        </Modal>
      )}

      {/* MODAL CREATE (Giữ nguyên) */}
      {showCreateModal && (
        <Modal isOpen={true} onClose={() => setShowCreateModal(false)}>
          <ModalHeader onClose={() => setShowCreateModal(false)}>
            <ModalTitle>Tạo đơn nghỉ phép mới</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <FormGroup>
              <FormLabel required>Mã nhân viên</FormLabel>
              <FormInput placeholder="VD: 102" value={createForm.nhanvienId} onChange={(e) => setCreateForm({ ...createForm, nhanvienId: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <FormLabel required>Loại phép</FormLabel>
              <FormSelect value={createForm.loaiPhep} onChange={(e) => setCreateForm({ ...createForm, loaiPhep: e.target.value })}>
                <option value="PHEP_NAM">Phép năm</option>
                <option value="OM">Nghỉ ốm</option>
                <option value="KO_LUONG">Không lương</option>
              </FormSelect>
            </FormGroup>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormGroup>
                <FormLabel required>Từ ngày</FormLabel>
                <FormInput type="date" value={createForm.ngayBatDau} onChange={(e) => setCreateForm({ ...createForm, ngayBatDau: e.target.value })} />
              </FormGroup>
              <FormGroup>
                <FormLabel required>Đến ngày</FormLabel>
                <FormInput type="date" value={createForm.ngayKetThuc} onChange={(e) => setCreateForm({ ...createForm, ngayKetThuc: e.target.value })} />
              </FormGroup>
            </div>
            <FormGroup>
              <FormLabel>Lý do</FormLabel>
              <FormTextarea placeholder="Nhập lý do chi tiết..." value={createForm.lyDo} onChange={(e) => setCreateForm({ ...createForm, lyDo: e.target.value })} />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Hủy bỏ</Button>
            <Button variant="success" onClick={handleCreateLeave}>Tạo đơn</Button>
          </ModalFooter>
        </Modal>
      )}
    </PageContainer>
  );
}
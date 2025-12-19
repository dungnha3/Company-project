import { useState, useMemo, useEffect } from 'react';
import { evaluationsService, employeesService } from '@/features/hr/shared/services';
import { usePermissions, useErrorHandler } from '@/shared/hooks';
import { useToast } from '@/shared/components/ui';
import { validateRequired } from '@/shared/utils/validation';
import {
  PageContainer,
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
  EmptyState
} from '@/shared/components/ui';

// SVG Icons
const IconCheck = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const IconX = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IconClock = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const IconEdit = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const IconUsers = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const IconStar = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
const IconSearch = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const IconChevronLeft = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
const IconChevronRight = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;

const itemsPerPage = 5;

export default function EvaluationsPage({ glassMode = false }) {
  const [evaluations, setEvaluations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [selectedEval, setSelectedEval] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [approvalAction, setApprovalAction] = useState(null);

  const [formData, setFormData] = useState({
    nhanvienId: '', kyDanhGia: '', loaiDanhGia: 'HANG_QUY',
    diemChuyenMon: '', diemThaiDo: '', diemKyNangMem: '', diemDongDoi: '',
    nhanXet: '', mucTieuTiepTheo: '', keHoachPhatTrien: '',
    ngayBatDau: new Date().toISOString().split('T')[0], ngayKetThuc: ''
  });

  const { isHRManager } = usePermissions();
  const { handleError } = useErrorHandler();
  const toast = useToast();

  useEffect(() => {
    fetchEvaluationsData();
    fetchEmployees();
  }, []);

  useEffect(() => { setCurrentPage(1); }, [filterStatus, searchTerm]);

  const fetchEvaluationsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await evaluationsService.getAll();
      setEvaluations(data || []);
    } catch (err) {
      setError(handleError(err, { context: 'load_evaluations' }));
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await employeesService.getAll();
      setEmployees(data || []);
    } catch (err) {
      handleError(err, { context: 'load_employees' });
    }
  };

  const filteredEvals = useMemo(() => {
    return evaluations.filter(e => {
      const matchStatus = filterStatus === 'ALL' || e.trangThai === filterStatus;
      const matchSearch = e.tenNhanVien.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [evaluations, filterStatus, searchTerm]);

  const totalPages = Math.ceil(filteredEvals.length / itemsPerPage);
  const paginatedEvals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvals.slice(start, start + itemsPerPage);
  }, [filteredEvals, currentPage]);

  const stats = {
    total: evaluations.length,
    pending: evaluations.filter(e => e.trangThai === 'CHO_DUYET').length,
    approved: evaluations.filter(e => e.trangThai === 'DA_DUYET').length,
    excellent: evaluations.filter(e => e.xepLoai === 'XUAT_SAC').length,
  };

  const handleSubmitForApproval = async (evalItem) => {
    if (!confirm(`Xác nhận gửi đánh giá của ${evalItem.tenNhanVien} để duyệt?`)) return;
    try {
      await evaluationsService.submit(evalItem.danhGiaId);
      toast.success('Đã gửi đánh giá để duyệt!');
      fetchEvaluationsData();
    } catch (err) {
      toast.error('Gửi đánh giá thất bại: ' + (err.response?.data?.message || err.message));
    }
  };

  const openApprovalModal = (evalItem, action) => {
    setSelectedEval(evalItem);
    setApprovalAction(action);
    setApprovalNote('');
    setShowApprovalModal(true);
  };

  const handleApprovalSubmit = async () => {
    if (!selectedEval) return;
    if (approvalAction === 'REJECT' && validateRequired(approvalNote, 'Lý do từ chối')) {
      toast.warning('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      if (approvalAction === 'APPROVE') {
        await evaluationsService.approve(selectedEval.danhGiaId, approvalNote || 'Approved');
        toast.success('Đã phê duyệt đánh giá thành công!');
      } else {
        await evaluationsService.reject(selectedEval.danhGiaId, approvalNote);
        toast.success('Đã từ chối đánh giá!');
      }
      fetchEvaluationsData();
      setShowApprovalModal(false);
      setSelectedEval(null);
      setApprovalNote('');
    } catch (err) {
      toast.error(handleError(err, { context: approvalAction === 'APPROVE' ? 'approve_evaluation' : 'reject_evaluation' }));
    }
  };

  const handleCreateSubmit = async () => {
    const errors = [];
    if (validateRequired(formData.nhanvienId, 'Nhân viên')) errors.push('Nhân viên');
    if (validateRequired(formData.kyDanhGia, 'Kỳ đánh giá')) errors.push('Kỳ đánh giá');
    ['diemChuyenMon', 'diemThaiDo', 'diemKyNangMem', 'diemDongDoi'].forEach(f => {
      if (validateRequired(formData[f], f)) errors.push(f);
    });
    if (validateRequired(formData.ngayBatDau, 'Ngày bắt đầu')) errors.push('Ngày bắt đầu');
    if (validateRequired(formData.ngayKetThuc, 'Ngày kết thúc')) errors.push('Ngày kết thúc');
    if (formData.ngayBatDau && formData.ngayKetThuc && new Date(formData.ngayKetThuc) < new Date(formData.ngayBatDau)) {
      errors.push('Ngày kết thúc phải sau ngày bắt đầu');
    }
    if (errors.length > 0) {
      toast.warning('Vui lòng điền: ' + errors.join(', '));
      return;
    }

    try {
      await evaluationsService.create({
        ...formData,
        nhanvienId: Number(formData.nhanvienId),
        diemChuyenMon: Number(formData.diemChuyenMon),
        diemThaiDo: Number(formData.diemThaiDo),
        diemKyNangMem: Number(formData.diemKyNangMem),
        diemDongDoi: Number(formData.diemDongDoi)
      });
      toast.success('Tạo đánh giá thành công!');
      setFormData({
        nhanvienId: '', kyDanhGia: '', loaiDanhGia: 'HANG_QUY',
        diemChuyenMon: '', diemThaiDo: '', diemKyNangMem: '', diemDongDoi: '',
        nhanXet: '', mucTieuTiepTheo: '', keHoachPhatTrien: '',
        ngayBatDau: new Date().toISOString().split('T')[0], ngayKetThuc: ''
      });
      fetchEvaluationsData();
      setShowCreateModal(false);
    } catch (err) {
      toast.error(handleError(err, { context: 'create_evaluation' }));
    }
  };

  // Helper functions
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
      background: `${bg}25`, color: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 700, border: `1px solid ${bg}40`
    };
  };

  const getStatusBadge = (status) => {
    const config = {
      DANG_DANH_GIA: { bg: '#e0f2fe', color: '#0369a1', icon: <IconEdit size={14} />, label: 'Đang đánh giá' },
      CHO_DUYET: { bg: '#fff7ed', color: '#c2410c', icon: <IconClock size={14} />, label: 'Chờ duyệt' },
      DA_DUYET: { bg: '#f0fdf4', color: '#15803d', icon: <IconCheck size={14} />, label: 'Đã duyệt' },
      TU_CHOI: { bg: '#fef2f2', color: '#b91c1c', icon: <IconX size={14} />, label: 'Từ chối' },
    };
    const s = config[status] || config.DANG_DANH_GIA;
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

  const getRankBadge = (rank) => {
    const config = {
      XUAT_SAC: { color: '#059669', bg: '#ecfdf5', label: 'XUẤT SẮC', icon: '🏆' },
      TOT: { color: '#2563eb', bg: '#eff6ff', label: 'TỐT', icon: '👍' },
      KHA: { color: '#f59e0b', bg: '#fff7ed', label: 'KHÁ', icon: '⭐' },
      TRUNG_BINH: { color: '#8b5cf6', bg: '#f5f3ff', label: 'TRUNG BÌNH', icon: '📊' },
      YEU: { color: '#ef4444', bg: '#fef2f2', label: 'YẾU', icon: '⚠️' }
    };
    const r = config[rank] || { color: '#6b7280', bg: '#f3f4f6', label: rank, icon: '' };
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
        background: r.bg, color: r.color
      }}>
        {r.icon} {r.label}
      </span>
    );
  };

  const getEvalTypeBadge = (type) => {
    const types = {
      HANG_QUY: '📅 Hàng quý', HANG_NAM: '🎆 Hàng năm',
      THU_VIEC: '👤 Thử việc', THANG_CHUC: '🚀 Thăng chức',
      DANG_KY_TANG_LUONG: '💰 Tăng lương'
    };
    return types[type] || `📝 ${type}`;
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

  if (!isHRManager) {
    return (
      <PageContainer>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#ef4444' }}>Không có quyền truy cập</div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Chỉ HR Manager mới có quyền quản lý đánh giá nhân viên</div>
        </div>
      </PageContainer>
    );
  }

  if (loading) return <PageContainer><LoadingState message="Đang tải..." /></PageContainer>;
  if (error) return <PageContainer><ErrorState message={error} onRetry={fetchEvaluationsData} /></PageContainer>;

  return (
    <PageContainer>
      {/* Header */}
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Breadcrumb style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Quản lý nhân sự / Đánh giá</Breadcrumb>
          <PageTitle style={{ color: '#0f172a', fontSize: 24 }}>Đánh giá Hiệu suất Nhân viên</PageTitle>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          style={{
            borderRadius: '8px', padding: '10px 24px', fontWeight: 600,
            background: '#3b82f6', border: 'none', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
          }}
        >
          + Tạo đánh giá mới
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 32 }}>
        <ModernStatCard title="Tổng đánh giá" value={stats.total} icon={<IconUsers size={24} />} iconColor="#6366f1" />
        <ModernStatCard title="Chờ duyệt" value={stats.pending} icon={<IconClock size={24} />} iconColor="#f59e0b" />
        <ModernStatCard title="Đã duyệt" value={stats.approved} icon={<IconCheck size={24} />} iconColor="#10b981" />
        <ModernStatCard title="Xuất sắc" value={stats.excellent} icon={<IconStar size={24} />} iconColor="#ec4899" />
      </div>

      {/* Main Card */}
      <div style={{
        background: glassMode ? glassStyles.card.background : 'white',
        borderRadius: '16px',
        border: glassMode ? glassStyles.card.border : '1px solid #e2e8f0',
        backdropFilter: glassMode ? glassStyles.card.backdropFilter : 'none',
        boxShadow: glassMode ? glassStyles.card.boxShadow : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden'
      }}>
        {/* Filter Bar */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 16
        }}>
          <div style={{ background: '#f1f5f9', padding: 4, borderRadius: 8, display: 'flex', gap: 2 }}>
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'DANG_DANH_GIA', label: 'Đang đánh giá' },
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
                    padding: '8px 16px', borderRadius: 6, fontSize: 13,
                    fontWeight: isActive ? 600 : 500, cursor: 'pointer',
                    boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease',
                    background: isActive ? 'white' : 'transparent',
                    color: isActive ? '#0f172a' : '#64748b'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

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

        {/* Table */}
        <Table style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: '18%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '8%' }} />
          </colgroup>
          <TableHeader>
            <TableRow style={{ background: glassMode ? glassStyles.tableHeader.background : '#f8fafc', borderBottom: glassMode ? glassStyles.tableHeader.borderBottom : '1px solid #e2e8f0' }}>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'left' }}>NHÂN VIÊN</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>KỲ</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>CHUYÊN MÔN</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>THÁI ĐỘ</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>KỸ NĂNG MỀM</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>ĐỒNG ĐỘI</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>TỔNG</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>XẾP LOẠI</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>TRẠNG THÁI</TableHead>
              <TableHead style={{ padding: '14px 16px', textAlign: 'center' }}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEvals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" style={{ padding: 48 }}>
                  <EmptyState icon="📊" title="Không có dữ liệu" message="Không tìm thấy đánh giá nào" />
                </TableCell>
              </TableRow>
            ) : (
              paginatedEvals.map(e => (
                <TableRow key={e.danhGiaId} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s', background: glassMode ? 'rgba(255,255,255,0.2)' : 'transparent' }}>
                  <TableCell style={{ padding: '16px', textAlign: 'left', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {e.avatar ? (
                        <img src={e.avatar} alt="Avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={getAvatarStyle(e.tenNhanVien)}>
                          {e.tenNhanVien ? e.tenNhanVien.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{e.tenNhanVien}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{e.chucVu}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{e.kyDanhGia}</div>
                    <div style={{ fontSize: 11, color: '#7b809a', marginTop: 2 }}>{getEvalTypeBadge(e.loaiDanhGia)}</div>
                  </TableCell>
                  <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>{e.diemChuyenMon}</span>
                  </TableCell>
                  <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>{e.diemThaiDo}</span>
                  </TableCell>
                  <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>{e.diemKyNangMem}</span>
                  </TableCell>
                  <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>{e.diemDongDoi}</span>
                  </TableCell>
                  <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <span style={{ background: 'linear-gradient(195deg, #ec4899, #d946ef)', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 15, fontWeight: 700 }}>{e.diemTong}</span>
                  </TableCell>
                  <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {getRankBadge(e.xepLoai)}
                  </TableCell>
                  <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {getStatusBadge(e.trangThai)}
                  </TableCell>
                  <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                      {e.trangThai === 'DANG_DANH_GIA' && (
                        <div onClick={() => handleSubmitForApproval(e)} title="Gửi duyệt"
                          style={{ width: 32, height: 32, borderRadius: 6, background: 'white', border: '1px solid #e2e8f0', color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#fff7ed'; e.currentTarget.style.color = '#f59e0b'; e.currentTarget.style.borderColor = '#f59e0b'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                        </div>
                      )}
                      {e.trangThai === 'CHO_DUYET' && (
                        <>
                          <div onClick={() => openApprovalModal(e, 'APPROVE')} title="Phê duyệt"
                            style={{ width: 32, height: 32, borderRadius: 6, background: 'white', border: '1px solid #e2e8f0', color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.color = '#10b981'; e.currentTarget.style.borderColor = '#10b981'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                            <IconCheck size={16} />
                          </div>
                          <div onClick={() => openApprovalModal(e, 'REJECT')} title="Từ chối"
                            style={{ width: 32, height: 32, borderRadius: 6, background: 'white', border: '1px solid #e2e8f0', color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                            <IconX size={16} />
                          </div>
                        </>
                      )}
                      <div onClick={() => setSelectedEval(e)} title="Xem chi tiết"
                        style={{ width: 32, height: 32, borderRadius: 6, background: 'white', border: '1px solid #e2e8f0', color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {filteredEvals.length > 0 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Hiển thị <b>{(currentPage - 1) * itemsPerPage + 1}</b> - <b>{Math.min(currentPage * itemsPerPage, filteredEvals.length)}</b> trên tổng <b>{filteredEvals.length}</b>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ border: '1px solid #e2e8f0', background: 'white', padding: '6px 10px', borderRadius: 6, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#cbd5e1' : '#475569', display: 'flex' }}>
                <IconChevronLeft />
              </button>
              {[...Array(totalPages)].map((_, idx) => (
                <button key={idx} onClick={() => setCurrentPage(idx + 1)}
                  style={{ border: currentPage === idx + 1 ? 'none' : '1px solid #e2e8f0', background: currentPage === idx + 1 ? '#3b82f6' : 'white', color: currentPage === idx + 1 ? 'white' : '#475569', width: 32, height: 32, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {idx + 1}
                </button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                style={{ border: '1px solid #e2e8f0', background: 'white', padding: '6px 10px', borderRadius: 6, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#cbd5e1' : '#475569', display: 'flex' }}>
                <IconChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEval && !showApprovalModal && (
        <Modal isOpen={true} onClose={() => setSelectedEval(null)} size="large">
          <ModalHeader onClose={() => setSelectedEval(null)}>
            <ModalTitle>Chi tiết Đánh giá</ModalTitle>
          </ModalHeader>
          <ModalBody style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 20, borderBottom: '1px solid #f1f5f9', marginBottom: 20 }}>
              {selectedEval.avatar ? (
                <img src={selectedEval.avatar} alt="Avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ ...getAvatarStyle(selectedEval.tenNhanVien), width: 56, height: 56, fontSize: 20 }}>
                  {selectedEval.tenNhanVien ? selectedEval.tenNhanVien.charAt(0) : 'U'}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{selectedEval.tenNhanVien}</div>
                <div style={{ fontSize: 14, color: '#64748b' }}>{selectedEval.chucVu} - {selectedEval.phongBan}</div>
              </div>
              <div>{getRankBadge(selectedEval.xepLoai)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              {[
                { label: 'Kỳ đánh giá', val: selectedEval.kyDanhGia },
                { label: 'Loại đánh giá', val: getEvalTypeBadge(selectedEval.loaiDanhGia) },
                { label: 'Người đánh giá', val: selectedEval.tenNguoiDanhGia },
                { label: 'Trạng thái', val: getStatusBadge(selectedEval.trangThai) },
              ].map((item, idx) => (
                <div key={idx}>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 15, color: '#334155', fontWeight: 500 }}>{item.val}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: '#334155' }}>📊 Chi tiết điểm số</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {[
                  { label: 'Chuyên môn', score: selectedEval.diemChuyenMon, color: '#3b82f6' },
                  { label: 'Thái độ', score: selectedEval.diemThaiDo, color: '#10b981' },
                  { label: 'Kỹ năng mềm', score: selectedEval.diemKyNangMem, color: '#f59e0b' },
                  { label: 'Đồng đội', score: selectedEval.diemDongDoi, color: '#8b5cf6' }
                ].map((item, idx) => (
                  <div key={idx}>
                    <div style={{ fontSize: 12, color: '#7b809a', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: item.color, marginBottom: 4 }}>{item.score}</div>
                    <div style={{ height: 6, borderRadius: 3, background: `${item.color}20`, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.score * 10}%`, background: item.color, borderRadius: 3, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: 12, borderRadius: 8, border: '2px solid #e5e7eb' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Tổng điểm:</span>
                <span style={{ fontSize: 32, fontWeight: 700, color: '#ec4899' }}>{selectedEval.diemTong}</span>
              </div>
            </div>

            {selectedEval.nhanXet && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>📝 Nhận xét</div>
                <div style={{ background: '#fff', padding: 10, borderRadius: 8, fontSize: 13, lineHeight: 1.5, border: '1px solid #e9ecef', color: '#334155' }}>{selectedEval.nhanXet}</div>
              </div>
            )}
            {selectedEval.mucTieuTiepTheo && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>🎯 Mục tiêu tiếp theo</div>
                <div style={{ background: '#fff', padding: 10, borderRadius: 8, fontSize: 13, lineHeight: 1.5, border: '1px solid #e9ecef', color: '#334155' }}>{selectedEval.mucTieuTiepTheo}</div>
              </div>
            )}
            {selectedEval.keHoachPhatTrien && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>🚀 Kế hoạch phát triển</div>
                <div style={{ background: '#fff', padding: 10, borderRadius: 8, fontSize: 13, lineHeight: 1.5, border: '1px solid #e9ecef', color: '#334155' }}>{selectedEval.keHoachPhatTrien}</div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setSelectedEval(null)}>Đóng</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <Modal isOpen={true} onClose={() => setShowCreateModal(false)} size="large">
          <ModalHeader onClose={() => setShowCreateModal(false)}>
            <ModalTitle>Tạo đánh giá mới</ModalTitle>
          </ModalHeader>
          <ModalBody style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <FormGroup style={{ gridColumn: '1 / -1' }}>
                <FormLabel required>Nhân viên</FormLabel>
                <FormSelect value={formData.nhanvienId} onChange={e => setFormData({ ...formData, nhanvienId: e.target.value })}>
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map(emp => (
                    <option key={emp.nhanvienId} value={emp.nhanvienId}>{emp.hoTen} - {emp.chucVu?.tenChucVu || 'N/A'}</option>
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup>
                <FormLabel required>Kỳ đánh giá</FormLabel>
                <FormInput type="text" placeholder="VD: Q1-2024" value={formData.kyDanhGia} onChange={e => setFormData({ ...formData, kyDanhGia: e.target.value })} />
              </FormGroup>
              <FormGroup>
                <FormLabel required>Loại đánh giá</FormLabel>
                <FormSelect value={formData.loaiDanhGia} onChange={e => setFormData({ ...formData, loaiDanhGia: e.target.value })}>
                  <option value="HANG_QUY">📅 Hàng quý</option>
                  <option value="HANG_NAM">🎆 Hàng năm</option>
                  <option value="THU_VIEC">👤 Thử việc</option>
                  <option value="THANG_CHUC">🚀 Thăng chức</option>
                  <option value="DANG_KY_TANG_LUONG">💰 Đăng ký tăng lương</option>
                </FormSelect>
              </FormGroup>
              <FormGroup>
                <FormLabel required>Ngày bắt đầu</FormLabel>
                <FormInput type="date" value={formData.ngayBatDau} onChange={e => setFormData({ ...formData, ngayBatDau: e.target.value })} />
              </FormGroup>
              <FormGroup>
                <FormLabel required>Ngày kết thúc</FormLabel>
                <FormInput type="date" value={formData.ngayKetThuc} onChange={e => setFormData({ ...formData, ngayKetThuc: e.target.value })} />
              </FormGroup>
            </div>

            <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: '#334155' }}>📊 Điểm đánh giá (0-10)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { key: 'diemChuyenMon', label: 'Chuyên môn (40%)' },
                  { key: 'diemThaiDo', label: 'Thái độ (30%)' },
                  { key: 'diemKyNangMem', label: 'Kỹ năng mềm (20%)' },
                  { key: 'diemDongDoi', label: 'Đồng đội (10%)' }
                ].map(item => (
                  <FormGroup key={item.key}>
                    <FormLabel required>{item.label}</FormLabel>
                    <FormInput type="number" min="0" max="10" step="0.1" placeholder="0-10"
                      value={formData[item.key]} onChange={e => setFormData({ ...formData, [item.key]: e.target.value })} />
                  </FormGroup>
                ))}
              </div>
            </div>

            <FormGroup>
              <FormLabel>📝 Nhận xét</FormLabel>
              <FormTextarea placeholder="Nhận xét về hiệu suất làm việc..." rows={3}
                value={formData.nhanXet} onChange={e => setFormData({ ...formData, nhanXet: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <FormLabel>🎯 Mục tiêu tiếp theo</FormLabel>
              <FormTextarea placeholder="Đặt mục tiêu cho kỳ tiếp theo..." rows={2}
                value={formData.mucTieuTiepTheo} onChange={e => setFormData({ ...formData, mucTieuTiepTheo: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <FormLabel>🚀 Kế hoạch phát triển</FormLabel>
              <FormTextarea placeholder="Kế hoạch phát triển năng lực..." rows={2}
                value={formData.keHoachPhatTrien} onChange={e => setFormData({ ...formData, keHoachPhatTrien: e.target.value })} />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Hủy</Button>
            <Button variant="success" onClick={handleCreateSubmit}>Tạo đánh giá</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedEval && (
        <Modal isOpen={true} onClose={() => setShowApprovalModal(false)}>
          <ModalHeader onClose={() => setShowApprovalModal(false)}>
            <ModalTitle>{approvalAction === 'APPROVE' ? '🟢 Phê duyệt đánh giá' : '🔴 Từ chối đánh giá'}</ModalTitle>
          </ModalHeader>
          <ModalBody style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: '#f8f9fa', borderRadius: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectedEval.avatar ? (
                  <img src={selectedEval.avatar} alt="Avatar" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ ...getAvatarStyle(selectedEval.tenNhanVien), width: 42, height: 42 }}>
                    {selectedEval.tenNhanVien ? selectedEval.tenNhanVien.charAt(0) : 'U'}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>{selectedEval.tenNhanVien}</div>
                  <div style={{ fontSize: 12, color: '#7b809a' }}>{selectedEval.chucVu} - {selectedEval.kyDanhGia}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#7b809a', marginBottom: 4 }}>Xếp loại</div>
                {getRankBadge(selectedEval.xepLoai)}
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              {[
                { label: 'Chuyên môn:', value: selectedEval.diemChuyenMon },
                { label: 'Thái độ:', value: selectedEval.diemThaiDo },
                { label: 'Kỹ năng mềm:', value: selectedEval.diemKyNangMem },
                { label: 'Đồng đội:', value: selectedEval.diemDongDoi }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ fontSize: 13, color: '#7b809a', fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 15, color: '#334155', fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e9ecef', paddingTop: 8, marginTop: 8 }}>
                <span style={{ fontSize: 13, color: '#334155', fontWeight: 700 }}>Điểm tổng:</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#ec4899' }}>{selectedEval.diemTong}</span>
              </div>
            </div>

            <FormGroup>
              <FormLabel>{approvalAction === 'APPROVE' ? '📝 Ghi chú (không bắt buộc)' : '❗ Lý do từ chối *'}</FormLabel>
              <FormTextarea placeholder={approvalAction === 'APPROVE' ? 'Nhập ghi chú phê duyệt...' : 'Nhập lý do từ chối (bắt buộc)...'}
                rows={4} value={approvalNote} onChange={e => setApprovalNote(e.target.value)} />
            </FormGroup>

            {approvalAction === 'REJECT' && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: 12, fontSize: 13, color: '#c2410c', marginTop: 12 }}>
                ⚠️ Đánh giá sẽ chuyển về trạng thái "Từ chối" và không thể hoàn tác.
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowApprovalModal(false)}>Hủy</Button>
            <Button variant={approvalAction === 'APPROVE' ? 'success' : 'danger'} onClick={handleApprovalSubmit}>
              {approvalAction === 'APPROVE' ? '✓ Xác nhận phê duyệt' : '✗ Xác nhận từ chối'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </PageContainer>
  );
}

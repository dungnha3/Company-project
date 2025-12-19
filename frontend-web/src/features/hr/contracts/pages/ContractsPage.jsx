import { useState, useMemo, useEffect } from 'react';
import { contractsService, employeesService } from '@/features/hr/shared/services';
import { usePermissions, useErrorHandler } from '@/shared/hooks';
import { validateRequired, validateDateRange } from '@/shared/utils/validation';
import { useToast } from '@/shared/components/ui';
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
const IconFileText = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>;
const IconSearch = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const IconChevronLeft = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
const IconChevronRight = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;

export default function ContractsPage({ glassMode = false }) {
  // --- STATE ---
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search
  const [activeTab, setActiveTab] = useState('HIEU_LUC');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const { isHRManager, isProjectManager, isAccountingManager } = usePermissions();
  const { handleError } = useErrorHandler();
  const toast = useToast();

  // Modal State
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [newEndDate, setNewEndDate] = useState('');
  const [formData, setFormData] = useState({
    nhanvienId: '',
    loaiHopDong: 'THU_VIEC',
    ngayBatDau: new Date().toISOString().split('T')[0],
    ngayKetThuc: '',
    luongCoBan: '',
    noiDung: ''
  });

  // --- EFFECT ---
  useEffect(() => {
    loadData();
  }, []);

  // Reset về trang 1 khi filter thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [contractsData, employeesData] = await Promise.all([
        contractsService.getAll(),
        employeesService.getAll()
      ]);
      setContracts(contractsData || []);
      setEmployees(employeesData || []);
    } catch (err) {
      const errorMessage = handleError(err, { context: 'load_contracts' });
      setError(errorMessage);
      setContracts([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC FILTER & PAGINATION ---
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const matchStatus = activeTab === 'ALL' || c.trangThai === activeTab;
      const matchSearch = c.hoTenNhanVien?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [contracts, activeTab, searchTerm]);

  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredContracts.slice(start, start + itemsPerPage);
  }, [filteredContracts, currentPage]);

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.trangThai === 'HIEU_LUC').length,
    expiring: contracts.filter(c => c.trangThai === 'HIEU_LUC' && c.soNgayConLai <= 90 && c.soNgayConLai > 0).length,
    cancelled: contracts.filter(c => c.trangThai === 'BI_HUY').length,
  };

  // --- HANDLERS ---
  const handleViewDetail = (contract) => {
    setSelectedContract(contract);
    setShowDetailModal(true);
  };

  const handleRenew = (contract) => {
    setSelectedContract(contract);
    setNewEndDate(contract.ngayKetThuc || '');
    setShowRenewModal(true);
  };

  const handleConfirmRenew = async () => {
    if (!newEndDate) return toast.warning("Vui lòng chọn ngày kết thúc mới!");

    try {
      setLoading(true);
      await contractsService.renew(selectedContract.hopdongId, newEndDate);
      await loadData();
      setShowRenewModal(false);
      toast.success(`Đã gia hạn hợp đồng thành công đến ${newEndDate}`);
    } catch (err) {
      const errorMessage = handleError(err, { context: 'renew_contract' });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (confirm('Bạn có chắc chắn muốn HỦY hợp đồng này? Thao tác không thể hoàn tác.')) {
      try {
        setLoading(true);
        await contractsService.cancel(id);
        await loadData();
        toast.success('Hủy hợp đồng thành công!');
      } catch (err) {
        const errorMessage = handleError(err, { context: 'cancel_contract' });
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreateContract = async () => {
    // Validation
    const errors = [];

    const empError = validateRequired(formData.nhanvienId, 'Nhân viên');
    if (empError) errors.push(empError);

    const startDateError = validateRequired(formData.ngayBatDau, 'Ngày bắt đầu');
    if (startDateError) errors.push(startDateError);

    if (formData.loaiHopDong !== 'VO_THOI_HAN') {
      const endDateError = validateRequired(formData.ngayKetThuc, 'Ngày kết thúc');
      if (endDateError) errors.push(endDateError);

      if (formData.ngayBatDau && formData.ngayKetThuc) {
        const dateRangeError = validateDateRange(formData.ngayBatDau, formData.ngayKetThuc);
        if (dateRangeError) errors.push(dateRangeError);
      }
    }

    const salaryError = validateRequired(formData.luongCoBan, 'Lương cơ bản');
    if (salaryError) errors.push(salaryError);
    else if (Number(formData.luongCoBan) <= 0) errors.push('Lương cơ bản phải lớn hơn 0');

    if (errors.length > 0) {
      return toast.error(errors.join('\n'));
    }

    try {
      setLoading(true);
      await contractsService.create({
        ...formData,
        nhanvienId: Number(formData.nhanvienId),
        luongCoBan: Number(formData.luongCoBan)
      });
      await loadData();
      setShowCreateModal(false);
      // Reset form
      setFormData({
        nhanvienId: '',
        loaiHopDong: 'THU_VIEC',
        ngayBatDau: new Date().toISOString().split('T')[0],
        ngayKetThuc: '',
        luongCoBan: '',
        noiDung: ''
      });
      toast.success('Tạo hợp đồng thành công!');
    } catch (err) {
      const errorMessage = handleError(err, { context: 'create_contract' });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // --- HELPER FUNCTIONS ---
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '---';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

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

  const getStatusBadge = (status, daysRemaining) => {
    const isExpiring = daysRemaining !== null && daysRemaining <= 90 && daysRemaining > 0;

    const config = {
      HIEU_LUC: { bg: '#f0fdf4', color: '#15803d', icon: <IconCheck size={14} />, label: 'Hiệu lực' },
      HET_HAN: { bg: '#fff7ed', color: '#c2410c', icon: <IconClock size={14} />, label: 'Hết hạn' },
      BI_HUY: { bg: '#fef2f2', color: '#b91c1c', icon: <IconX size={14} />, label: 'Đã hủy' },
    };

    const s = config[status] || config.HIEU_LUC;

    // Override for expiring contracts
    if (isExpiring && status === 'HIEU_LUC') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#fef3c7', color: '#c2410c',
          padding: '6px 12px', borderRadius: '6px',
          fontSize: '12px', fontWeight: 600
        }}>
          <IconClock size={14} /> Sắp hết ({daysRemaining} ngày)
        </span>
      );
    }

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

  const getContractTypeBadge = (type) => {
    const types = {
      THU_VIEC: { label: 'Thử việc', color: '#f59e0b' },
      XAC_DINH: { label: 'Xác định T.Hạn', color: '#3b82f6' },
      VO_THOI_HAN: { label: 'Vô thời hạn', color: '#10b981' },
    };
    const t = types[type] || types.THU_VIEC;
    return <span style={{ color: t.color, fontWeight: 600, fontSize: 13 }}>{t.label}</span>;
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

  // Permission guard
  if (!isHRManager) {
    return (
      <PageContainer>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#ef4444' }}>Không có quyền truy cập</div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Chỉ HR Manager mới có quyền quản lý hợp đồng</div>
        </div>
      </PageContainer>
    );
  }

  if (loading) return <PageContainer><LoadingState message="Đang tải..." /></PageContainer>;
  if (error) return <PageContainer><ErrorState message={error} onRetry={loadData} /></PageContainer>;

  return (
    <PageContainer>
      {/* 1. HEADER */}
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Breadcrumb style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Quản lý nhân sự / Hợp đồng</Breadcrumb>
          <PageTitle style={{ color: '#0f172a', fontSize: 24 }}>Quản lý Hợp Đồng</PageTitle>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          style={{
            borderRadius: '8px', padding: '10px 24px', fontWeight: 600,
            background: '#3b82f6', border: 'none', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
          }}
        >
          + Tạo hợp đồng mới
        </Button>
      </div>

      {/* 2. STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 32 }}>
        <ModernStatCard title="Đang hiệu lực" value={stats.active} icon={<IconCheck size={24} />} iconColor="#10b981" />
        <ModernStatCard title="Sắp hết hạn" value={stats.expiring} icon={<IconClock size={24} />} iconColor="#f59e0b" />
        <ModernStatCard title="Đã hủy" value={stats.cancelled} icon={<IconX size={24} />} iconColor="#ef4444" />
        <ModernStatCard title="Tổng hợp đồng" value={stats.total} icon={<IconFileText size={24} />} iconColor="#3b82f6" />
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
              { id: 'HIEU_LUC', label: 'Hiệu lực' },
              { id: 'HET_HAN', label: 'Hết hạn' },
              { id: 'BI_HUY', label: 'Đã hủy' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
            <col style={{ width: '20%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
          </colgroup>
          <TableHeader>
            <TableRow style={{ background: glassMode ? glassStyles.tableHeader.background : '#f8fafc', borderBottom: glassMode ? glassStyles.tableHeader.borderBottom : '1px solid #e2e8f0' }}>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'left' }}>NHÂN VIÊN</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>LOẠI HĐ</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>BẮT ĐẦU</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>KẾT THÚC</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>LƯƠNG CƠ BẢN</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>TRẠNG THÁI</TableHead>
              <TableHead style={{ padding: '14px 16px', textAlign: 'center' }}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedContracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" style={{ padding: 48 }}>
                  <EmptyState icon="📋" title="Không có dữ liệu" message="Không tìm thấy hợp đồng nào" />
                </TableCell>
              </TableRow>
            ) : (
              paginatedContracts.map(contract => {
                const isPermanent = contract.loaiHopDong === 'VO_THOI_HAN';
                const isExpiringSoon = contract.soNgayConLai !== null && contract.soNgayConLai <= 90 && contract.soNgayConLai > 0 && contract.trangThai === 'HIEU_LUC';

                return (
                  <TableRow key={contract.hopdongId} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s', cursor: 'pointer', background: glassMode ? 'rgba(255,255,255,0.2)' : 'transparent' }} onClick={() => handleViewDetail(contract)}>

                    {/* Cột Nhân viên */}
                    <TableCell style={{ padding: '16px', textAlign: 'left', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10 }}>
                        {contract.avatarUrl ? (
                          <img src={contract.avatarUrl} alt="Avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={getAvatarStyle(contract.hoTenNhanVien)}>
                            {contract.hoTenNhanVien ? contract.hoTenNhanVien.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{contract.hoTenNhanVien || 'N/A'}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{contract.tenChucVu || 'Chưa có chức vụ'}</div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Cột Loại HĐ */}
                    <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      {getContractTypeBadge(contract.loaiHopDong)}
                    </TableCell>

                    {/* Cột Bắt đầu */}
                    <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{contract.ngayBatDau}</span>
                    </TableCell>

                    {/* Cột Kết thúc */}
                    <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: 13, color: isPermanent ? '#3b82f6' : '#334155', fontWeight: 500, fontStyle: isPermanent ? 'italic' : 'normal' }}>
                        {contract.ngayKetThuc || 'Vô thời hạn'}
                      </span>
                    </TableCell>

                    {/* Cột Lương */}
                    <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span style={{ fontWeight: 600, color: '#059669', fontSize: 13 }}>{formatCurrency(contract.luongCoBan)}</span>
                    </TableCell>

                    {/* Cột Trạng thái */}
                    <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      {getStatusBadge(contract.trangThai, contract.soNgayConLai)}
                    </TableCell>

                    {/* Cột Action */}
                    <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                        {/* Nút gia hạn */}
                        {contract.trangThai === 'HIEU_LUC' && !isPermanent && (
                          <div
                            onClick={() => handleRenew(contract)}
                            title="Gia hạn hợp đồng"
                            style={{
                              width: 32, height: 32, borderRadius: 6,
                              background: 'white', border: '1px solid #e2e8f0',
                              color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', transition: 'all 0.2s',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f0f9ff';
                              e.currentTarget.style.color = '#3b82f6';
                              e.currentTarget.style.borderColor = '#3b82f6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'white';
                              e.currentTarget.style.color = '#64748b';
                              e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                          </div>
                        )}

                        {/* Nút hủy */}
                        {contract.trangThai === 'HIEU_LUC' && (
                          <div
                            onClick={() => handleCancel(contract.hopdongId)}
                            title="Hủy hợp đồng"
                            style={{
                              width: 32, height: 32, borderRadius: 6,
                              background: 'white', border: '1px solid #e2e8f0',
                              color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', transition: 'all 0.2s',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#fef2f2';
                              e.currentTarget.style.color = '#ef4444';
                              e.currentTarget.style.borderColor = '#ef4444';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'white';
                              e.currentTarget.style.color = '#64748b';
                              e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                          </div>
                        )}

                        {/* Nút xem chi tiết */}
                        <div
                          onClick={() => handleViewDetail(contract)}
                          title="Xem chi tiết"
                          style={{
                            width: 32, height: 32, borderRadius: 6,
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
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* 4. PAGINATION FOOTER */}
        {filteredContracts.length > 0 && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: glassMode ? 'transparent' : '#ffffff'
          }}>            <div style={{ fontSize: 13, color: '#64748b' }}>
              Hiển thị <b>{(currentPage - 1) * itemsPerPage + 1}</b> - <b>{Math.min(currentPage * itemsPerPage, filteredContracts.length)}</b> trên tổng <b>{filteredContracts.length}</b>
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

      {/* MODAL CHI TIẾT HỢP ĐỒNG */}
      {showDetailModal && selectedContract && (
        <Modal isOpen={true} onClose={() => setShowDetailModal(false)}>
          <ModalHeader onClose={() => setShowDetailModal(false)}>
            <ModalTitle>Chi tiết Hợp đồng</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 20, borderBottom: '1px solid #f1f5f9', marginBottom: 20 }}>
              {selectedContract.avatarUrl ? (
                <img src={selectedContract.avatarUrl} alt="Avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ ...getAvatarStyle(selectedContract.hoTenNhanVien), width: 56, height: 56, fontSize: 20 }}>
                  {selectedContract.hoTenNhanVien ? selectedContract.hoTenNhanVien.charAt(0) : 'U'}
                </div>
              )}
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{selectedContract.hoTenNhanVien}</div>
                <div style={{ fontSize: 14, color: '#64748b' }}>{selectedContract.tenChucVu}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>{getStatusBadge(selectedContract.trangThai, selectedContract.soNgayConLai)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              {[
                { label: 'Loại hợp đồng', val: getContractTypeBadge(selectedContract.loaiHopDong) },
                { label: 'Mã hợp đồng', val: `#${selectedContract.hopdongId}` },
                { label: 'Ngày bắt đầu', val: selectedContract.ngayBatDau },
                { label: 'Ngày kết thúc', val: selectedContract.ngayKetThuc || 'Vô thời hạn' },
                { label: 'Lương cơ bản', val: formatCurrency(selectedContract.luongCoBan) },
                { label: 'Ngày ký', val: selectedContract.createdAt ? new Date(selectedContract.createdAt).toLocaleDateString('vi-VN') : '---' },
              ].map((item, idx) => (
                <div key={idx}>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 15, color: '#334155', fontWeight: 500 }}>{item.val}</div>
                </div>
              ))}
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Nội dung / Ghi chú</div>
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, color: '#334155', fontSize: 14, border: '1px solid #e2e8f0' }}>
                  {selectedContract.noiDung || 'Không có nội dung chi tiết'}
                </div>
              </div>
            </div>
          </ModalBody>
        </Modal>
      )}

      {/* MODAL TẠO HỢP ĐỒNG MỚI */}
      {showCreateModal && (
        <Modal isOpen={true} onClose={() => setShowCreateModal(false)}>
          <ModalHeader onClose={() => setShowCreateModal(false)}>
            <ModalTitle>Tạo hợp đồng mới</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <FormGroup>
              <FormLabel required>Nhân viên</FormLabel>
              <FormSelect
                value={formData.nhanvienId}
                onChange={(e) => setFormData({ ...formData, nhanvienId: e.target.value })}
              >
                <option value="">-- Chọn nhân viên --</option>
                {employees.map(emp => (
                  <option key={emp.nhanvienId} value={emp.nhanvienId}>
                    {emp.hoTen} - {emp.maNhanVien || `NV${emp.nhanvienId}`}
                  </option>
                ))}
              </FormSelect>
            </FormGroup>
            <FormGroup>
              <FormLabel required>Loại hợp đồng</FormLabel>
              <FormSelect
                value={formData.loaiHopDong}
                onChange={(e) => {
                  setFormData({ ...formData, loaiHopDong: e.target.value });
                  // Nếu chọn vô thời hạn, xóa ngày kết thúc
                  if (e.target.value === 'VO_THOI_HAN') {
                    setFormData(prev => ({ ...prev, loaiHopDong: e.target.value, ngayKetThuc: '' }));
                  }
                }}
              >
                <option value="THU_VIEC">Thử việc</option>
                <option value="XAC_DINH">Xác định thời hạn</option>
                <option value="VO_THOI_HAN">Vô thời hạn</option>
              </FormSelect>
            </FormGroup>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormGroup>
                <FormLabel required>Ngày bắt đầu</FormLabel>
                <FormInput
                  type="date"
                  value={formData.ngayBatDau}
                  onChange={(e) => setFormData({ ...formData, ngayBatDau: e.target.value })}
                />
              </FormGroup>
              <FormGroup>
                <FormLabel required={formData.loaiHopDong !== 'VO_THOI_HAN'}>Ngày kết thúc</FormLabel>
                <FormInput
                  type="date"
                  value={formData.ngayKetThuc}
                  onChange={(e) => setFormData({ ...formData, ngayKetThuc: e.target.value })}
                  disabled={formData.loaiHopDong === 'VO_THOI_HAN'}
                  min={formData.ngayBatDau}
                />
              </FormGroup>
            </div>
            <FormGroup>
              <FormLabel required>Lương cơ bản</FormLabel>
              <FormInput
                type="number"
                value={formData.luongCoBan}
                onChange={(e) => setFormData({ ...formData, luongCoBan: e.target.value })}
                placeholder="VD: 10000000"
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Nội dung hợp đồng</FormLabel>
              <FormTextarea
                value={formData.noiDung}
                onChange={(e) => setFormData({ ...formData, noiDung: e.target.value })}
                placeholder="Mô tả chi tiết nội dung hợp đồng..."
              />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Hủy</Button>
            <Button variant="success" onClick={handleCreateContract}>Tạo hợp đồng</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* MODAL GIA HẠN */}
      {showRenewModal && selectedContract && (
        <Modal isOpen={true} onClose={() => setShowRenewModal(false)}>
          <ModalHeader onClose={() => setShowRenewModal(false)}>
            <ModalTitle>Gia hạn Hợp đồng</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ background: '#fff7ed', padding: 16, borderRadius: 8, border: '1px solid #fed7aa', marginBottom: 16, fontSize: 14 }}>
              Đang gia hạn cho <b>{selectedContract.hoTenNhanVien}</b>
            </div>
            <FormGroup>
              <FormLabel>Ngày kết thúc hiện tại</FormLabel>
              <FormInput value={selectedContract.ngayKetThuc} disabled style={{ background: '#f8f9fa', color: '#7b809a' }} />
            </FormGroup>
            <FormGroup>
              <FormLabel required>Ngày kết thúc MỚI</FormLabel>
              <FormInput
                type="date"
                value={newEndDate}
                onChange={e => setNewEndDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowRenewModal(false)}>Hủy</Button>
            <Button variant="success" onClick={handleConfirmRenew}>Xác nhận Gia hạn</Button>
          </ModalFooter>
        </Modal>
      )}
    </PageContainer>
  );
}
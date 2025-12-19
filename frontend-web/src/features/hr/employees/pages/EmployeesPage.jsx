import { useState, useEffect, useMemo } from 'react';
import { employeesService, departmentsService, positionsService } from '@/features/hr/shared/services';
import { apiService } from '@/shared/services/api.service';
import { usePermissions, useErrorHandler } from '@/shared/hooks';
import { useToast } from '@/shared/components/ui';
import { validateEmployee } from '@/shared/utils/validation';
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
  LoadingState,
  ErrorState,
  EmptyState,
  PermissionDenied
} from '@/shared/components/ui';

// --- ICONS (SVG) ---
const IconCheck = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const IconX = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IconClock = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const IconUsers = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const IconSearch = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const IconChevronLeft = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
const IconChevronRight = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;

const ITEMS_PER_PAGE = 5;

export default function EmployeesPage({ onViewDetail, glassMode = false }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [createMode, setCreateMode] = useState('existing'); // 'existing' hoặc 'new'
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  const { isHRManager, isProjectManager, isAccountingManager, currentUser } = usePermissions();
  const { handleError } = useErrorHandler();
  const toast = useToast();

  // PM self-view mode: only show own profile
  const isSelfViewMode = isProjectManager && !isHRManager;

  const [newEmp, setNewEmp] = useState({
    userId: '',
    hoTen: '',
    cccd: '',
    ngaySinh: '',
    gioiTinh: 'Nam',
    diaChi: '',
    ngayVaoLam: new Date().toISOString().split('T')[0],
    phongbanId: '',
    chucvuId: '',
    luongCoBan: '',
    phuCap: '',
    // Fields cho tạo user mới
    username: '',
    password: '',
    role: 'EMPLOYEE',
    email: '',
    soDienThoai: ''
  });

  // Load dữ liệu từ API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load employees, departments, positions
      const [empData, deptData, posData] = await Promise.all([
        employeesService.getAll(),
        departmentsService.getAll(),
        positionsService.getAll()
      ]);

      setEmployees(empData);
      setDepartments(deptData);
      setPositions(posData);

      // Load users (for dropdown)
      try {
        const usersData = await apiService.get('/api/users');
        setUsers(usersData || []);
      } catch (err) {
        console.warn('Could not load users list', err);
        setUsers([]);
      }
    } catch (err) {
      const errorMessage = handleError(err, { context: 'load_employees_data' });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEmp({ ...newEmp, [name]: value });
  };

  const handleEdit = (emp) => {
    setIsEditing(true);
    setCreateMode('existing');
    setSelectedEmpId(emp.nhanvienId);
    setNewEmp({
      userId: emp.userId || '',
      hoTen: emp.hoTen || '',
      cccd: emp.cccd || '',
      ngaySinh: emp.ngaySinh || '',
      gioiTinh: emp.gioiTinh || 'Nam',
      diaChi: emp.diaChi || '',
      ngayVaoLam: emp.ngayVaoLam || '',
      phongbanId: emp.phongbanId || '',
      chucvuId: emp.chucvuId || '',
      luongCoBan: emp.luongCoBan || '',
      phuCap: emp.phuCap || '',
      // Fields user/contact cần load khi edit
      username: emp.username || '',
      password: '', // Không load password
      role: 'EMPLOYEE',
      email: emp.email || '',
      soDienThoai: emp.sdt || emp.soDienThoai || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormErrors({});

    try {
      setLoading(true);

      if (isEditing) {
        // Cập nhật nhân viên
        console.log('Validating update data:', newEmp);
        let validationErrors = validateEmployee(newEmp);

        // Khi edit, bỏ qua validate các trường user/contact vì API update không xử lý
        if (validationErrors) {
          delete validationErrors.email;
          delete validationErrors.soDienThoai;
          // Nếu object rỗng sau khi xóa thì coi như không có lỗi
          if (Object.keys(validationErrors).length === 0) {
            validationErrors = null;
          }
        }

        if (validationErrors) {
          console.error('Validation errors:', validationErrors);
          setFormErrors(validationErrors);
          toast.error('Vui lòng kiểm tra lại thông tin!');
          setLoading(false);
          return;
        }

        await employeesService.update(selectedEmpId, {
          userId: Number(newEmp.userId),
          hoTen: newEmp.hoTen,
          cccd: newEmp.cccd || null,
          ngaySinh: newEmp.ngaySinh,
          gioiTinh: newEmp.gioiTinh,
          diaChi: newEmp.diaChi || null,
          ngayVaoLam: newEmp.ngayVaoLam,
          phongbanId: newEmp.phongbanId ? Number(newEmp.phongbanId) : null,
          chucvuId: newEmp.chucvuId ? Number(newEmp.chucvuId) : null,
          luongCoBan: newEmp.luongCoBan ? Number(newEmp.luongCoBan) : 0,
          phuCap: newEmp.phuCap ? Number(newEmp.phuCap) : 0
        });
        toast.success('Cập nhật nhân viên thành công!');
      } else if (createMode === 'new') {
        // Tạo tài khoản và nhân viên cùng lúc
        if (!newEmp.username || !newEmp.password || !newEmp.email) {
          toast.warning('Vui lòng điền đầy đủ: Username, Password, Email!');
          setLoading(false);
          return;
        }

        const payload = {
          username: newEmp.username,
          password: newEmp.password,
          role: newEmp.role,
          hoTen: newEmp.hoTen,
          email: newEmp.email,
          gioiTinh: newEmp.gioiTinh,
          diaChi: newEmp.diaChi || null,
          ngaySinh: newEmp.ngaySinh,
          ngayVaoLam: newEmp.ngayVaoLam,
          soDienThoai: newEmp.soDienThoai || null,
          cccd: newEmp.cccd || null,
          phongBanId: newEmp.phongbanId ? Number(newEmp.phongbanId) : null,
          chucVuId: newEmp.chucvuId ? Number(newEmp.chucvuId) : null
        };
        console.log('=== CREATE EMPLOYEE WITH ACCOUNT ===');
        console.log('Payload:', JSON.stringify(payload, null, 2));
        await apiService.post('/api/accounts/with-employee', payload);
        toast.success('Tạo tài khoản và nhân viên thành công!');
      } else {
        // Chỉ tạo nhân viên (user đã có sẵn)
        const validationErrors = validateEmployee(newEmp);
        if (validationErrors) {
          setFormErrors(validationErrors);
          toast.error('Vui lòng kiểm tra lại thông tin!');
          setLoading(false);
          return;
        }

        await employeesService.create({
          userId: Number(newEmp.userId),
          hoTen: newEmp.hoTen,
          cccd: newEmp.cccd || null,
          ngaySinh: newEmp.ngaySinh,
          gioiTinh: newEmp.gioiTinh,
          diaChi: newEmp.diaChi || null,
          ngayVaoLam: newEmp.ngayVaoLam,
          phongbanId: newEmp.phongbanId ? Number(newEmp.phongbanId) : null,
          chucvuId: newEmp.chucvuId ? Number(newEmp.chucvuId) : null,
          luongCoBan: newEmp.luongCoBan ? Number(newEmp.luongCoBan) : 0,
          phuCap: newEmp.phuCap ? Number(newEmp.phuCap) : 0
        });
        toast.success('Thêm nhân viên thành công!');
      }

      await loadData();
      setShowModal(false);
      setCreateMode('existing');
      setIsEditing(false);
      setSelectedEmpId(null);
      setNewEmp({
        userId: '',
        hoTen: '',
        cccd: '',
        ngaySinh: '',
        gioiTinh: 'Nam',
        diaChi: '',
        ngayVaoLam: new Date().toISOString().split('T')[0],
        phongbanId: '',
        chucvuId: '',
        luongCoBan: '',
        phuCap: '',
        username: '',
        password: '',
        role: 'EMPLOYEE',
        email: '',
        soDienThoai: ''
      });
    } catch (err) {
      const errorMessage = handleError(err, { context: isEditing ? 'update_employee' : (createMode === 'new' ? 'create_account_with_employee' : 'create_employee') });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn chắc chắn muốn xóa nhân viên này?')) {
      try {
        setLoading(true);
        await employeesService.delete(id);
        await loadData();
        toast.success('Xóa nhân viên thành công!');
      } catch (err) {
        const errorMessage = handleError(err, { context: 'delete_employee' });
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterDept]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.hoTen?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.maNhanVien?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'ALL' || emp.trangThai === filterStatus;
      const matchesDept = filterDept === 'ALL' || (emp.phongbanId && String(emp.phongbanId) === String(filterDept));

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [employees, searchTerm, filterStatus, filterDept]);

  // Pagination logic
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEmployees.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEmployees, currentPage]);

  // Stats calculation
  const stats = {
    active: employees.filter(e => e.trangThai === 'DANG_LAM_VIEC').length,
    tempOff: employees.filter(e => e.trangThai === 'TAM_NGHI').length,
    terminated: employees.filter(e => e.trangThai === 'NGHI_VIEC').length,
    total: employees.length
  };

  // Format currency
  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

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

  // Get status badge
  const getStatusBadge = (status) => {
    const config = {
      DANG_LAM_VIEC: { bg: '#f0fdf4', color: '#15803d', icon: <IconCheck size={14} />, label: 'Đang làm' },
      NGHI_VIEC: { bg: '#fef2f2', color: '#b91c1c', icon: <IconX size={14} />, label: 'Nghỉ việc' },
      TAM_NGHI: { bg: '#fff7ed', color: '#c2410c', icon: <IconClock size={14} />, label: 'Tạm nghỉ' }
    };
    const s = config[status] || config.DANG_LAM_VIEC;
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

  // Permission guard - Allow HR full access, PM self-view only
  if (!isHRManager && !isProjectManager) {
    return (
      <PageContainer>
        <PermissionDenied
          message="Không có quyền truy cập"
          description="Chỉ HR Manager hoặc Project Manager mới có quyền xem thông tin nhân viên"
        />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <LoadingState message="Đang tải dữ liệu nhân viên..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorState message={error} onRetry={loadData} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* 1. HEADER */}
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Breadcrumb style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Quản lý nhân sự / Nhân viên</Breadcrumb>
          <PageTitle style={{ color: '#0f172a', fontSize: 24 }}>Danh sách Nhân viên</PageTitle>
        </div>
        {isHRManager && (
          <Button
            variant="primary"
            onClick={() => {
              setIsEditing(false);
              setCreateMode('existing');
              setNewEmp({
                userId: '',
                hoTen: '',
                cccd: '',
                ngaySinh: '',
                gioiTinh: 'Nam',
                diaChi: '',
                ngayVaoLam: new Date().toISOString().split('T')[0],
                phongbanId: '',
                chucvuId: '',
                luongCoBan: '',
                phuCap: '',
                username: '',
                password: '',
                role: 'EMPLOYEE',
                email: '',
                soDienThoai: ''
              });
              setShowModal(true);
            }}
            style={{
              borderRadius: '8px', padding: '10px 24px', fontWeight: 600,
              background: '#3b82f6', border: 'none', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
            }}
          >
            + Thêm mới
          </Button>
        )}
      </div>

      {/* PM Self-view Notice */}
      {isSelfViewMode && (
        <div style={{
          background: '#eff6ff',
          padding: 16,
          borderRadius: 12,
          border: '1px solid #bfdbfe',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          marginBottom: 24
        }}>
          <span style={{ fontSize: 18 }}>ℹ️</span>
          <div>
            <div style={{ fontWeight: 600, color: '#3b82f6' }}>Chế độ xem cá nhân</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              Project Manager chỉ có thể xem thông tin nhân viên. Để quản lý, liên hệ HR Manager.
            </div>
          </div>
        </div>
      )}

      {/* 2. STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 32 }}>
        <ModernStatCard title="Đang làm việc" value={stats.active} icon={<IconCheck size={24} />} iconColor="#10b981" />
        <ModernStatCard title="Tạm nghỉ" value={stats.tempOff} icon={<IconClock size={24} />} iconColor="#f59e0b" />
        <ModernStatCard title="Đã nghỉ việc" value={stats.terminated} icon={<IconX size={24} />} iconColor="#ef4444" />
        <ModernStatCard title="Tổng nhân viên" value={stats.total} icon={<IconUsers size={24} />} iconColor="#3b82f6" />
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
              { id: 'DANG_LAM_VIEC', label: 'Đang làm' },
              { id: 'TAM_NGHI', label: 'Tạm nghỉ' },
              { id: 'NGHI_VIEC', label: 'Nghỉ việc' }
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

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Department Filter */}
            <FormSelect
              style={{ minWidth: 150, fontSize: 13 }}
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
            >
              <option value="ALL">Tất cả phòng ban</option>
              {departments.map(dept => (
                <option key={dept.phongbanId} value={dept.phongbanId}>
                  {dept.tenPhongBan}
                </option>
              ))}
            </FormSelect>

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
        </div>

        {/* TABLE - FIXED LAYOUT ĐỂ CỘT ĐỒNG ĐỀU */}
        <Table style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: isAccountingManager ? '18%' : '22%' }} />
            <col style={{ width: isAccountingManager ? '18%' : '22%' }} />
            <col style={{ width: isAccountingManager ? '15%' : '20%' }} />
            {isAccountingManager && <col style={{ width: '15%' }} />}
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            {isHRManager && <col style={{ width: '12%' }} />}
          </colgroup>
          <TableHeader>
            <TableRow style={{ background: glassMode ? glassStyles.tableHeader.background : '#f8fafc', borderBottom: glassMode ? glassStyles.tableHeader.borderBottom : '1px solid #e2e8f0' }}>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'left' }}>NHÂN VIÊN</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>LIÊN HỆ</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>VỊ TRÍ</TableHead>
              {isAccountingManager && <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>LƯƠNG CB</TableHead>}
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>NGÀY VÀO</TableHead>
              <TableHead style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>TRẠNG THÁI</TableHead>
              {isHRManager && <TableHead style={{ padding: '14px 16px', textAlign: 'center' }}></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isHRManager ? (isAccountingManager ? 7 : 6) : (isAccountingManager ? 6 : 5)} align="center" style={{ padding: 48 }}>
                  <EmptyState
                    icon="👥"
                    title="Không có nhân viên"
                    message="Chưa có nhân viên nào được thêm vào hệ thống"
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginatedEmployees.map(emp => (
                <TableRow
                  key={emp.nhanvienId}
                  style={{
                    borderBottom: glassMode ? '1px solid rgba(255,255,255,0.4)' : '1px solid #f1f5f9',
                    transition: 'all 0.2s',
                    background: glassMode ? 'rgba(255,255,255,0.2)' : 'transparent'
                  }}
                  className={glassMode ? 'glass-row-hover' : ''}
                >
                  {/* Cột Nhân viên */}
                  <TableCell style={{ padding: '16px', textAlign: 'left', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10 }}>
                      {emp.avatarUrl ? (
                        <img src={emp.avatarUrl} alt="Avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={getAvatarStyle(emp.hoTen)}>
                          {emp.hoTen ? emp.hoTen.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{emp.hoTen}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {emp.maNhanVien || `NV${emp.nhanvienId}`}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Cột Liên hệ */}
                  <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#334155', fontWeight: 500 }} title={emp.email}>
                        {emp.email ? (emp.email.length > 20 ? emp.email.substring(0, 20) + '...' : emp.email) : 'Chưa cập nhật'}
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {emp.sdt || 'Chưa cập nhật'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Cột Vị trí */}
                  <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>
                      {emp.tenPhongBan || emp.phongban?.tenPhongBan || 'N/A'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      {emp.tenChucVu || emp.chucvu?.tenChucVu || 'N/A'}
                    </div>
                  </TableCell>

                  {/* Cột Lương (chỉ Accounting Manager) */}
                  {isAccountingManager && (
                    <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span style={{ fontWeight: 600, color: '#059669', fontSize: 13 }}>
                        {emp.luongCoBan ? formatCurrency(emp.luongCoBan) : '---'}
                      </span>
                    </TableCell>
                  )}

                  {/* Cột Ngày vào */}
                  <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{emp.ngayVaoLam}</span>
                  </TableCell>

                  {/* Cột Trạng thái */}
                  <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {getStatusBadge(emp.trangThai)}
                  </TableCell>

                  {/* Cột Action (chỉ HR Manager) */}
                  {isHRManager && (
                    <TableCell style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                        {/* Nút sửa */}
                        <div
                          onClick={(e) => { e.stopPropagation(); handleEdit(emp); }}
                          title="Sửa"
                          style={{
                            width: 32, height: 32, borderRadius: 6,
                            background: 'white', border: '1px solid #e2e8f0',
                            color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#eff6ff';
                            e.currentTarget.style.color = '#3b82f6';
                            e.currentTarget.style.borderColor = '#3b82f6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.color = '#64748b';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </div>

                        {/* Nút xóa */}
                        <div
                          onClick={(e) => { e.stopPropagation(); handleDelete(emp.nhanvienId); }}
                          title="Xóa"
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
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </div>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* 4. PAGINATION FOOTER */}
        {filteredEmployees.length > 0 && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: glassMode ? 'transparent' : '#ffffff'
          }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Hiển thị <b>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</b> - <b>{Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)}</b> trên tổng <b>{filteredEmployees.length}</b>
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

      {/* MODAL THÊM/SỬA NHÂN VIÊN */}
      {showModal && (
        <Modal isOpen={true} onClose={() => setShowModal(false)} size="medium-large">
          <ModalHeader onClose={() => setShowModal(false)}>
            <ModalTitle>{isEditing ? 'Cập nhật thông tin nhân viên' : 'Thêm nhân viên mới'}</ModalTitle>
          </ModalHeader>

          <ModalBody style={{
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '24px 32px'
          }}>
            {/* Toggle Mode - Only show when NOT editing */}
            {!isEditing && (
              <div style={{
                marginBottom: 24,
                padding: 12,
                background: '#f8fafc',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                position: 'sticky',
                top: -24,
                zIndex: 10,
                marginTop: -24,
                marginLeft: -32,
                marginRight: -32,
                paddingLeft: 32,
                paddingRight: 32,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ fontWeight: 600, marginBottom: 10, color: '#334155', fontSize: 13 }}>Chế độ tạo</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setCreateMode('existing')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: createMode === 'existing' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                      background: createMode === 'existing' ? '#eff6ff' : '#fff',
                      color: createMode === 'existing' ? '#1e40af' : '#64748b',
                      fontWeight: createMode === 'existing' ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: 13
                    }}
                  >
                    👤 Chọn tài khoản có sẵn
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode('new')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: createMode === 'new' ? '2px solid #10b981' : '1px solid #cbd5e1',
                      background: createMode === 'new' ? '#ecfdf5' : '#fff',
                      color: createMode === 'new' ? '#047857' : '#64748b',
                      fontWeight: createMode === 'new' ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: 13
                    }}
                  >
                    ➕ Tạo tài khoản mới
                  </button>
                </div>
              </div>
            )}

            {/* Section: Thông tin tài khoản - Chỉ hiện khi tạo mới và chọn mode new */}
            {!isEditing && createMode === 'new' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: '#334155',
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: '2px solid #e2e8f0'
                }}>
                  🔐 Thông tin tài khoản
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormGroup>
                    <FormLabel required>Username</FormLabel>
                    <FormInput
                      name="username"
                      value={newEmp.username}
                      onChange={handleInputChange}
                      placeholder="vd: nguyen_van_a"
                      error={formErrors.username}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel required>Password</FormLabel>
                    <FormInput
                      type="password"
                      name="password"
                      value={newEmp.password}
                      onChange={handleInputChange}
                      placeholder="Tối thiểu 6 ký tự"
                      error={formErrors.password}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel required>Email</FormLabel>
                    <FormInput
                      type="email"
                      name="email"
                      value={newEmp.email}
                      onChange={handleInputChange}
                      placeholder="email@example.com"
                      error={formErrors.email}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel required>Role</FormLabel>
                    <FormSelect
                      name="role"
                      value={newEmp.role}
                      onChange={handleInputChange}
                    >
                      <option value="EMPLOYEE">Nhân viên</option>
                      <option value="MANAGER_PROJECT">Quản lý dự án</option>
                      <option value="MANAGER_HR">Quản lý nhân sự</option>
                      <option value="MANAGER_ACCOUNTING">Quản lý kế toán</option>
                      <option value="ADMIN">Admin</option>
                    </FormSelect>
                  </FormGroup>

                  <FormGroup style={{ gridColumn: '1 / -1' }}>
                    <FormLabel>Số điện thoại</FormLabel>
                    <FormInput
                      name="soDienThoai"
                      value={newEmp.soDienThoai}
                      onChange={handleInputChange}
                      placeholder="0901234567"
                    />
                  </FormGroup>
                </div>
              </div>
            )}

            {/* Section: Thông tin cơ bản */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontWeight: 600,
                fontSize: 14,
                color: '#334155',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '2px solid #e2e8f0'
              }}>
                👤 Thông tin cơ bản
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {!isEditing && createMode === 'existing' && (
                  <FormGroup style={{ gridColumn: '1 / -1' }}>
                    <FormLabel required>Tài khoản</FormLabel>
                    <FormSelect
                      name="userId"
                      value={newEmp.userId}
                      onChange={handleInputChange}
                      error={formErrors.userId}
                    >
                      <option value="">-- Chọn tài khoản --</option>
                      {users.map(user => (
                        <option key={user.userId} value={user.userId}>
                          {user.username} ({user.email})
                        </option>
                      ))}
                    </FormSelect>
                  </FormGroup>
                )}

                <FormGroup>
                  <FormLabel required>Họ và tên</FormLabel>
                  <FormInput
                    name="hoTen"
                    value={newEmp.hoTen}
                    onChange={handleInputChange}
                    placeholder="Nguyễn Văn A"
                    error={formErrors.hoTen}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>CCCD</FormLabel>
                  <FormInput
                    name="cccd"
                    value={newEmp.cccd}
                    onChange={handleInputChange}
                    placeholder="001234567890"
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel required>Ngày sinh</FormLabel>
                  <FormInput
                    type="date"
                    name="ngaySinh"
                    value={newEmp.ngaySinh}
                    onChange={handleInputChange}
                    error={formErrors.ngaySinh}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel required>Giới tính</FormLabel>
                  <FormSelect
                    name="gioiTinh"
                    value={newEmp.gioiTinh}
                    onChange={handleInputChange}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </FormSelect>
                </FormGroup>

                <FormGroup style={{ gridColumn: '1 / -1' }}>
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormInput
                    name="diaChi"
                    value={newEmp.diaChi}
                    onChange={handleInputChange}
                    placeholder="123 Nguyễn Trãi, Q1"
                  />
                </FormGroup>
              </div>
            </div>

            {/* Section: Công việc */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontWeight: 600,
                fontSize: 14,
                color: '#334155',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '2px solid #e2e8f0'
              }}>
                💼 Thông tin công việc
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormGroup>
                  <FormLabel required>Ngày vào làm</FormLabel>
                  <FormInput
                    type="date"
                    name="ngayVaoLam"
                    value={newEmp.ngayVaoLam}
                    onChange={handleInputChange}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Phòng ban</FormLabel>
                  <FormSelect
                    name="phongbanId"
                    value={newEmp.phongbanId}
                    onChange={handleInputChange}
                    error={formErrors.phongbanId}
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map(dept => (
                      <option key={dept.phongbanId} value={dept.phongbanId}>
                        {dept.tenPhongBan}
                      </option>
                    ))}
                  </FormSelect>
                </FormGroup>

                <FormGroup>
                  <FormLabel>Chức vụ</FormLabel>
                  <FormSelect
                    name="chucvuId"
                    value={newEmp.chucvuId}
                    onChange={handleInputChange}
                    error={formErrors.chucvuId}
                  >
                    <option value="">-- Chọn chức vụ --</option>
                    {positions.map(pos => (
                      <option key={pos.chucvuId} value={pos.chucvuId}>
                        {pos.tenChucVu}
                      </option>
                    ))}
                  </FormSelect>
                </FormGroup>

                {isAccountingManager && (
                  <>
                    <FormGroup>
                      <FormLabel>Lương cơ bản</FormLabel>
                      <FormInput
                        type="number"
                        name="luongCoBan"
                        value={newEmp.luongCoBan}
                        onChange={handleInputChange}
                        placeholder="VD: 10000000"
                      />
                    </FormGroup>

                    <FormGroup>
                      <FormLabel>Phụ cấp</FormLabel>
                      <FormInput
                        type="number"
                        name="phuCap"
                        value={newEmp.phuCap}
                        onChange={handleInputChange}
                        placeholder="VD: 2000000"
                      />
                    </FormGroup>
                  </>
                )}
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Hủy bỏ
            </Button>
            <Button variant="success" onClick={handleSave}>
              {isEditing ? 'Cập nhật' : 'Lưu nhân viên'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </PageContainer>
  );
}

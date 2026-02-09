import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@uidotdev/usehooks';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import DataTable from '@shared/components/ui/DataTable';
import ExportButton from '@shared/components/ui/ExportButton';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useToast } from '@app/providers/ToastProvider';
import EmployeeFormModal from './components/EmployeeFormModal';

export default function EmployeesPage() {
    const navigate = useNavigate();
    const { hasRole } = useWorkspaceStore();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set()); // For bulk selection

    // State
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [keyword, setKeyword] = useState('');
    const [deptId, setDeptId] = useState('ALL');
    const [status, setStatus] = useState('ALL');

    const debouncedKeyword = useDebounce(keyword, 500);

    // Queries
    const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
        queryKey: ['employees', page, pageSize, debouncedKeyword, deptId, status],
        queryFn: async () => {
            const params = {
                page: page,
                size: pageSize,
                search: debouncedKeyword || undefined,
                departmentId: deptId !== 'ALL' ? deptId : undefined,
                status: status !== 'ALL' ? status : undefined,
            };

            const response = await apiClient.get(ENDPOINTS.EMPLOYEES.LIST, { params });
            return response.data;
        },
        placeholderData: (prev) => prev,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => apiClient.delete(ENDPOINTS.EMPLOYEES.DELETE(id)),
        onSuccess: () => {
            showToast('Xóa nhân viên thành công', 'success');
            queryClient.invalidateQueries(['employees']);
        },
        onError: (err) => {
            showToast(err.response?.data?.message || 'Không thể xóa nhân viên này', 'error');
        }
    });

    const handleDelete = (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa nhân viên này? Hành động này không thể hoàn tác.')) {
            deleteMutation.mutate(id);
        }
    };

    // Bulk actions
    const handleSelectAll = () => {
        if (selectedIds.size === employeesData?.content?.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(employeesData?.content?.map(e => e.nhanvienId) || []));
        }
    };

    const handleSelectOne = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkDelete = () => {
        if (window.confirm(`Bạn có chắc muốn xóa ${selectedIds.size} nhân viên đã chọn?`)) {
            // Delete one by one (or create bulk delete API)
            selectedIds.forEach(id => deleteMutation.mutate(id));
            setSelectedIds(new Set());
        }
    };

    const { data: departments } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.DEPARTMENTS.LIST);
            return response.data;
        },
        initialData: []
    });

    // Columns Configuration
    const columns = [
        // Checkbox column for bulk select
        {
            header: () => (
                <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === employeesData?.content?.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
            ),
            accessorKey: 'select',
            cell: (row) => (
                <input
                    type="checkbox"
                    checked={selectedIds.has(row.nhanvienId)}
                    onChange={() => handleSelectOne(row.nhanvienId)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
            )
        },
        {
            header: 'Nhân viên',
            accessorKey: 'hoTen',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    {row.avatarUrl ? (
                        <img src={row.avatarUrl} alt={row.hoTen} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100 uppercase">
                            {row.hoTen ? row.hoTen.charAt(0) : 'U'}
                        </div>
                    )}
                    <div>
                        <div className="font-semibold text-gray-900">{row.hoTen}</div>
                        <div className="text-xs text-gray-500">{row.maNhanVien || `ID: ${row.nhanvienId}`}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Liên hệ',
            accessorKey: 'email',
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-sm text-gray-700" title={row.email}>{row.email}</span>
                    <span className="text-xs text-gray-500">{row.soDienThoai || '---'}</span>
                </div>
            )
        },
        {
            header: 'Vị trí',
            accessorKey: 'phongban',
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800">{row.tenPhongBan || row.phongban?.tenPhongBan || '---'}</span>
                    <span className="text-xs text-gray-500">{row.tenChucVu || row.chucvu?.tenChucVu || '---'}</span>
                </div>
            )
        },
        // Salary column - Only for OWNER, ADMIN, MANAGER_ACCOUNTING
        ...(hasRole('OWNER') || hasRole('ADMIN') || hasRole('MANAGER_ACCOUNTING') ? [{
            header: 'Mức lương',
            accessorKey: 'luongCoBan',
            cell: (row) => (
                <span className="font-mono text-green-700 font-medium">
                    {row.luongCoBan ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.luongCoBan) : '---'}
                </span>
            )
        }] : []),
        {
            header: 'Ngày vào',
            accessorKey: 'ngayVaoLam',
            cell: (row) => <span className="text-gray-600">{row.ngayVaoLam ? new Date(row.ngayVaoLam).toLocaleDateString('vi-VN') : '---'}</span>
        },
        {
            header: 'Trạng thái',
            accessorKey: 'trangThai',
            cell: (row) => <StatusBadge status={row.trangThai} />
        },
        {
            header: '',
            accessorKey: 'actions',
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => navigate(`/app/hr/employees/${row.nhanvienId}`)}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-all"
                        title="Xem chi tiết"
                    >
                        <i className="fa-solid fa-eye" />
                    </button>
                    {(hasRole('OWNER') || hasRole('ADMIN') || hasRole('MANAGER_HR')) && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEmployeeId(row.nhanvienId);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Sửa"
                            >
                                <i className="fa-solid fa-pen" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(row.nhanvienId);
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Xóa"
                            >
                                <i className="fa-solid fa-trash" />
                            </button>
                        </>
                    )}
                </div>
            )
        }
    ];

    // Stats Calculation (Client-side approximation for now since API might paginate)
    // Ideally, backend should return stats in a separate endpoint or meta
    const stats = {
        active: employeesData?.content?.filter(e => e.trangThai === 'DANG_LAM_VIEC').length || 0, // This is only for current page if paginated logic isn't adapted for stats. BE probably needs a stats endpoint.
        // For now let's use placeholders or if we want real stats we call another API. 
        // Let's use hardcoded 0 for safety or remove stats cards until we have API.
        // Actually the old code did client side filtering on ALL employees. 
        // Since this is paginated, we can't do that.
        // Let's hide stats or use a `dashboard/stats` endpoint if available.
        // For now, I will keep layout simple without stats cards or static.
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Danh sách nhân viên</h1>
                    <p className="text-gray-500 text-sm">Quản lý hồ sơ và thông tin nhân sự</p>
                </div>
                <div className="flex gap-3">
                    {hasRole('MANAGER_HR') && (
                        <ExportButton
                            endpoint={ENDPOINTS.EXPORT.EMPLOYEES}
                            filename={`NhanVien_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '')}.xlsx`}
                            label="Xuất Excel"
                        />
                    )}
                    {hasRole('MANAGER_HR') && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn-primary shadow-lg shadow-primary/20"
                        >
                            <i className="fa-solid fa-plus" /> Thêm nhân viên
                        </button>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {hasRole('MANAGER_HR') && (
                <EmployeeFormModal
                    isOpen={showCreateModal || !!selectedEmployeeId}
                    onClose={() => {
                        setShowCreateModal(false);
                        setSelectedEmployeeId(null);
                    }}
                    employeeId={selectedEmployeeId}
                />
            )}

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-blue-700 font-medium">
                            Đã chọn {selectedIds.size} nhân viên
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <ExportButton
                            endpoint={ENDPOINTS.EXPORT.EMPLOYEES}
                            params={{ ids: Array.from(selectedIds).join(',') }}
                            filename={`NhanVien_Selected_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '')}.xlsx`}
                            label="Xuất đã chọn"
                            variant="secondary"
                        />
                        <button
                            onClick={handleBulkDelete}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
                        >
                            <i className="fa-solid fa-trash mr-1" /> Xóa đã chọn
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition-colors text-sm"
                        >
                            Bỏ chọn
                        </button>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Status Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {['ALL', 'DANG_LAM_VIEC', 'TAM_NGHI', 'NGHI_VIEC'].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatus(s)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${status === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {s === 'ALL' ? 'Tất cả' : s === 'DANG_LAM_VIEC' ? 'Đang làm' : s === 'TAM_NGHI' ? 'Tạm nghỉ' : 'Nghỉ việc'}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <select
                            className="input w-full md:w-48"
                            value={deptId}
                            onChange={(e) => setDeptId(e.target.value)}
                        >
                            <option value="ALL">Tất cả phòng ban</option>
                            {departments.map(d => (
                                <option key={d.phongbanId} value={d.phongbanId}>{d.tenPhongBan}</option>
                            ))}
                        </select>

                        <div className="relative w-full md:w-64">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input
                                type="text"
                                className="input pl-10"
                                placeholder="Tìm tên, email..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <DataTable
                loading={isLoadingEmployees}
                columns={columns}
                data={employeesData?.content || []}
                totalCount={employeesData?.totalElements || 0}
                pagination={{ pageIndex: page, pageSize }}
                onPaginationChange={({ pageIndex }) => setPage(pageIndex)}
            />
        </div>
    );
}

function StatusBadge({ status }) {
    const configs = {
        DANG_LAM_VIEC: { color: 'text-green-700 bg-green-50 border-green-100', icon: 'fa-check', label: 'Đang làm' },
        TAM_NGHI: { color: 'text-orange-700 bg-orange-50 border-orange-100', icon: 'fa-clock', label: 'Tạm nghỉ' },
        NGHI_VIEC: { color: 'text-red-700 bg-red-50 border-red-100', icon: 'fa-xmark', label: 'Nghỉ việc' },
    };

    const config = configs[status] || configs.DANG_LAM_VIEC;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${config.color}`}>
            <i className={`fa-solid ${config.icon}`}></i>
            {config.label}
        </span>
    );
}

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
import { formatDate, formatCurrency } from '@shared/utils/formatters';
import { Avatar } from '@shared/components/OptimizedImage';
import EmployeeFormModal from './components/EmployeeFormModal';

export default function EmployeesPage() {
    const navigate = useNavigate();
    const { hasPermission } = useWorkspaceStore();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set()); // For bulk selection

    // State
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('ALL');

    const debouncedKeyword = useDebounce(keyword, 500);

    // Queries
    const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
        queryKey: ['employees', page, pageSize, debouncedKeyword, status],
        queryFn: async () => {
            const params = {
                page: page,
                size: pageSize,
                search: debouncedKeyword || undefined,
                status: status !== 'ALL' ? status : undefined,
            };

            const response = await apiClient.get(ENDPOINTS.EMPLOYEES.PAGE, { params });
            return response.data;
        },
        placeholderData: (prev) => prev,
    });

    const employeeRows = Array.isArray(employeesData?.content)
        ? employeesData.content
        : (Array.isArray(employeesData) ? employeesData : []);
    const totalEmployees = typeof employeesData?.totalElements === 'number'
        ? employeesData.totalElements
        : employeeRows.length;
    const statusCounts = employeeRows.reduce((acc, e) => {
        acc.total += 1;
        if (e.status === 'ACTIVE') acc.active += 1;
        if (e.status === 'ON_LEAVE') acc.onLeave += 1;
        if (e.status === 'RESIGNED') acc.resigned += 1;
        return acc;
    }, { total: 0, active: 0, onLeave: 0, resigned: 0 });

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
        if (selectedIds.size === employeeRows.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(employeeRows.map(e => e.employeeId)));
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

    const handleBulkDelete = async () => {
        if (window.confirm(`Bạn có chắc muốn xóa ${selectedIds.size} nhân viên đã chọn?`)) {
            const ids = [...selectedIds];
            const results = await Promise.allSettled(
                ids.map(id => apiClient.delete(ENDPOINTS.EMPLOYEES.BY_ID(id)))
            );
            const failed = results.filter(r => r.status === 'rejected').length;
            if (failed > 0) {
                showToast(`${failed}/${ids.length} nhân viên xóa thất bại`, 'error');
            } else {
                showToast(`Đã xóa ${ids.length} nhân viên`, 'success');
            }
            queryClient.invalidateQueries(['employees']);
            setSelectedIds(new Set());
        }
    };

    // Columns Configuration
    const columns = [
        // Checkbox column for bulk select
        {
            header: () => (
                <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === employeeRows.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
            ),
            accessorKey: 'select',
            cell: (row) => (
                <input
                    type="checkbox"
                    checked={selectedIds.has(row.employeeId)}
                    onChange={() => handleSelectOne(row.employeeId)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
            )
        },
        {
            header: 'Nhân viên',
            accessorKey: 'fullName',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <Avatar src={row.avatarUrl} name={row.fullName} size="md" />
                    <div>
                        <div className="font-semibold text-gray-900">{row.fullName}</div>
                        <div className="text-xs text-gray-500">{row.idCard || `ID: ${row.employeeId}`}</div>
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
                    <span className="text-xs text-gray-500">{row.phone || '---'}</span>
                </div>
            )
        },
        // Removed department/position column
        // Salary column - Only for users with salaryView permission
        ...(hasPermission('salaryView') ? [{
            header: 'Mức lương',
            accessorKey: 'baseSalary',
            cell: (row) => (
                <span className="font-mono text-green-700 font-medium">
                    {row.baseSalary ? formatCurrency(row.baseSalary) : '---'}
                </span>
            )
        }] : []),
        {
            header: 'Ngày vào',
            accessorKey: 'hireDate',
            cell: (row) => <span className="text-gray-600 dark:text-gray-400">{row.hireDate ? formatDate(row.hireDate) : '---'}</span>
        },
        {
            header: 'Trạng thái',
            accessorKey: 'status',
            cell: (row) => <StatusBadge status={row.status} />
        },
        {
            header: '',
            accessorKey: 'actions',
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    {hasPermission('hrEditProfile') && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!row.userId) {
                                        showToast('Không tìm thấy userId để phân quyền', 'error');
                                        return;
                                    }
                                    navigate(`/app/company/settings?tab=members&memberUserId=${row.userId}`);
                                }}
                                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                title="Phân quyền"
                            >
                                <i className="fa-solid fa-sliders" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEmployeeId(row.employeeId);
                                }}
                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Sửa"
                            >
                                <i className="fa-solid fa-pen" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(row.employeeId);
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-white to-indigo-50/60 p-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
                            <i className="fa-solid fa-users" />
                            Nhân sự
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Danh sách thành viên</h1>
                        <p className="text-gray-600 text-sm mt-1">Quản lý nhân sự theo trạng thái, liên hệ và thông tin cơ bản</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:min-w-[360px]">
                        <MiniStat label="Trên trang" value={statusCounts.total} tone="slate" />
                        <MiniStat label="Đang làm" value={statusCounts.active} tone="green" />
                        <MiniStat label="Tạm nghỉ" value={statusCounts.onLeave} tone="amber" />
                        <MiniStat label="Nghỉ việc" value={statusCounts.resigned} tone="red" />
                    </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                    {hasPermission('hrEditProfile') && (
                        <ExportButton
                            endpoint={ENDPOINTS.EXPORT.EMPLOYEES}
                            filename={`NhanVien_${formatDate(new Date()).replace(/\//g, '')}.xlsx`}
                            label="Xuất Excel"
                        />
                    )}
                    {hasPermission('hrCreateEmployee') && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-colors"
                        >
                            <i className="fa-solid fa-plus" /> Thêm thành viên
                        </button>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {hasPermission('hrCreateEmployee') && (
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
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="text-indigo-700 font-medium">
                            Đã chọn {selectedIds.size} thành viên
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <ExportButton
                            endpoint={ENDPOINTS.EXPORT.EMPLOYEES}
                            params={{ ids: Array.from(selectedIds).join(',') }}
                            filename={`NhanVien_Selected_${formatDate(new Date()).replace(/\//g, '')}.xlsx`}
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Status Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        {['ALL', 'ACTIVE', 'ON_LEAVE', 'RESIGNED'].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatus(s)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${status === s ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {s === 'ALL' ? 'Tất cả' : s === 'ACTIVE' ? 'Đang làm' : s === 'ON_LEAVE' ? 'Tạm nghỉ' : 'Nghỉ việc'}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                placeholder="Tìm tên, email..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />
                        </div>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(0);
                            }}
                            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white"
                        >
                            <option value={10}>10 / trang</option>
                            <option value={20}>20 / trang</option>
                            <option value={50}>50 / trang</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden">
                <DataTable
                    loading={isLoadingEmployees}
                    columns={columns}
                    data={employeeRows}
                    totalCount={totalEmployees}
                    pagination={{ pageIndex: page, pageSize }}
                    onPaginationChange={({ pageIndex }) => setPage(pageIndex)}
                />
            </div>
        </div>
    );
}

function MiniStat({ label, value, tone }) {
    const toneClass = {
        slate: 'bg-slate-50 text-slate-700 border-slate-200',
        green: 'bg-green-50 text-green-700 border-green-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        red: 'bg-red-50 text-red-700 border-red-200',
    }[tone] || 'bg-slate-50 text-slate-700 border-slate-200';

    return (
        <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
            <p className="text-[11px] uppercase tracking-wide opacity-80">{label}</p>
            <p className="text-lg font-bold leading-tight">{value}</p>
        </div>
    );
}

function StatusBadge({ status }) {
    const configs = {
        ACTIVE: { color: 'text-green-700 bg-green-50 border-green-100', icon: 'fa-check', label: 'Đang làm' },
        ON_LEAVE: { color: 'text-orange-700 bg-orange-50 border-orange-100', icon: 'fa-clock', label: 'Tạm nghỉ' },
        RESIGNED: { color: 'text-red-700 bg-red-50 border-red-100', icon: 'fa-xmark', label: 'Nghỉ việc' },
    };

    const config = configs[status] || configs.ACTIVE;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${config.color}`}>
            <i className={`fa-solid ${config.icon}`}></i>
            {config.label}
        </span>
    );
}

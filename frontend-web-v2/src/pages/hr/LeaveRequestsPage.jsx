import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import DataTable from '@shared/components/ui/DataTable';
import ExportButton from '@shared/components/ui/ExportButton';
import ImportButton from '@shared/components/ui/ImportButton';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { formatDate, formatDateTime } from '@shared/utils/formatters';

export default function LeaveRequestsPage() {
    const { hasPermission } = useWorkspaceStore();
    const [activeTab, setActiveTab] = useState('my-requests');
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Fetch pending count for tab badge
    const { data: pendingData } = useQuery({
        queryKey: ['pending-leave-count'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.LEAVE_REQUESTS.PENDING, { params: { size: 1 } });
            const data = res?.data;
            return data?.totalElements ?? (Array.isArray(data?.content) ? data.content.length : 0) ?? 0;
        },
        refetchInterval: 30_000,
    });

    const pendingCount = (typeof pendingData === 'number') ? pendingData : 0;

    return (
        <div className="max-w-full mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center bg-white rounded-xl border border-gray-100 px-6 py-5 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-umbrella-beach text-gray-400 text-xl" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Nghỉ phép</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Quản lý đơn xin nghỉ phép</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {hasPermission('leaveViewAll') && (
                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <ExportButton
                                endpoint={ENDPOINTS.EXPORT.LEAVES}
                                params={{
                                    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
                                    endDate: new Date().toISOString().split('T')[0]
                                }}
                                filename={`NghiPhep_${new Date().getFullYear()}.xlsx`}
                                label="Xuất"
                                className="!rounded-none !border-0 !shadow-none hover:!bg-gray-50 !text-sm"
                            />
                            <div className="w-px h-6 bg-gray-200" />
                            <ImportButton
                                endpoint={ENDPOINTS.IMPORT.LEAVES}
                                templateEndpoint={ENDPOINTS.TEMPLATE.LEAVES}
                                templateFilename="Template_NghiPhep.xlsx"
                                label="Nhập"
                                className="!rounded-none !border-0 !shadow-none hover:!bg-gray-50 !text-sm !px-3"
                            />
                        </div>
                    )}
                    <button onClick={() => setShowCreateModal(true)} className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-medium shadow-sm transition-colors">
                        <i className="fa-solid fa-plus mr-2" /> Tạo đơn
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-100 px-4 shadow-sm">
                <nav className="flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('my-requests')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'my-requests' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <i className="fa-solid fa-list text-xs" />
                        Đơn của tôi
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'calendar' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <i className="fa-solid fa-calendar-days text-xs" />
                        Lịch nghỉ
                    </button>
                    {hasPermission('leaveApprove') && (
                        <button
                            onClick={() => setActiveTab('pending-approval')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'pending-approval' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            <i className="fa-solid fa-gavel text-xs" />
                            Cần duyệt
                            {pendingCount > 0 && (
                                <span className="ml-1 bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-xs font-medium">{pendingCount}</span>
                            )}
                        </button>
                    )}
                </nav>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'my-requests' && <MyLeaveRequests />}
                {activeTab === 'calendar' && <LeaveCalendar />}
                {activeTab === 'pending-approval' && hasPermission('leaveApprove') && <PendingLeaveRequests />}
            </div>

            {showCreateModal && (
                <CreateLeaveModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </div>
    );
}

// ─── My Leave Requests ───────────────────────────────────────────────────────

const LEAVE_TYPE_LABELS = {
    ANNUAL: { label: 'Nghỉ phép năm', color: 'bg-gray-100 text-gray-700', icon: 'fa-umbrella-beach' },
    SICK: { label: 'Nghỉ ốm', color: 'bg-red-50 text-red-700', icon: 'fa-head-side-virus' },
    UNPAID: { label: 'Nghỉ không lương', color: 'bg-gray-100 text-gray-600', icon: 'fa-clock' },
    MATERNITY: { label: 'Thai sản', color: 'bg-pink-50 text-pink-700', icon: 'fa-baby' },
    OTHER: { label: 'Khác', color: 'bg-gray-100 text-gray-600', icon: 'fa-ellipsis-h' },
};

function LeaveTypeBadge({ type }) {
    const cfg = LEAVE_TYPE_LABELS[type] || LEAVE_TYPE_LABELS.OTHER;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${cfg.color}`}>
            <i className={`fa-solid ${cfg.icon} text-[10px]`} />
            {cfg.label}
        </span>
    );
}

function StatusBadge({ status }) {
    const styles = {
        PENDING: { bg: 'bg-amber-50 text-amber-700', label: 'Chờ duyệt', icon: 'fa-clock' },
        APPROVED: { bg: 'bg-green-50 text-green-700', label: 'Đã duyệt', icon: 'fa-check-circle' },
        REJECTED: { bg: 'bg-red-50 text-red-700', label: 'Từ chối', icon: 'fa-xmark-circle' },
    };
    const s = styles[status] || styles.PENDING;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${s.bg}`}>
            <i className={`fa-solid ${s.icon} text-[10px]`} />
            {s.label}
        </span>
    );
}

function MyLeaveRequests() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [detailModal, setDetailModal] = useState(null);

    const { data: requests = [], isLoading } = useQuery({
        queryKey: ['my-leave-requests'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.LEAVE_REQUESTS.MY_REQUESTS, {
                params: { size: 100, sort: 'createdAt,desc' }
            });
            return res.data?.content || res.data || [];
        },
    });

    // Fetch leave balance
    const { data: balance } = useQuery({
        queryKey: ['leave-balance'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.LEAVE_REQUESTS.MY_BALANCE);
            return res.data;
        },
    });

    const remaining = balance?.remainingDays ?? null;
    const used = balance?.usedDays ?? null;
    const total = balance?.totalDays ?? 12;
    const pct = remaining != null ? Math.round((remaining / total) * 100) : null;
    const pending = requests.filter(r => r.status === 'PENDING').length;
    const approved = requests.filter(r => r.status === 'APPROVED').length;
    const rejected = requests.filter(r => r.status === 'REJECTED').length;

    const cancelMutation = useMutation({
        mutationFn: (id) => apiClient.delete(ENDPOINTS.LEAVE_REQUESTS.BY_ID(id)),
        onSuccess: () => {
            showToast('Đã xóa đơn nghỉ phép', 'success');
            queryClient.invalidateQueries(['my-leave-requests']);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Không thể xóa đơn', 'error'),
    });

    const columns = [
        {
            header: 'Loại nghỉ',
            accessorKey: 'leaveType',
            cell: (row) => <LeaveTypeBadge type={row.leaveType || row.type} />
        },
        {
            header: 'Thời gian',
            accessorKey: 'dateRange',
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-xs text-gray-700">{formatDate(row.startDate)} → {formatDate(row.endDate)}</span>
                    <span className="text-[10px] text-gray-400">{row.totalDays} ngày</span>
                </div>
            )
        },
        {
            header: 'Lý do',
            accessorKey: 'reason',
            cell: (row) => (
                <span className="truncate max-w-[200px] block text-gray-500 text-xs" title={row.reason}>
                    {row.reason || '—'}
                </span>
            )
        },
        {
            header: 'Dự án',
            accessorKey: 'projectName',
            cell: (row) => (
                <span className="text-xs text-gray-500 truncate max-w-[120px] block">
                    {row.projectName || '—'}
                </span>
            )
        },
        {
            header: 'Trạng thái',
            accessorKey: 'status',
            cell: (row) => <StatusBadge status={row.status} />
        },
        {
            header: 'Ngày tạo',
            accessorKey: 'createdAt',
            cell: (row) => (
                <span className="text-xs text-gray-400">{formatDate(row.createdAt)}</span>
            )
        },
        {
            header: '',
            accessorKey: 'actions',
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setDetailModal(row)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                        title="Chi tiết"
                    >
                        <i className="fa-solid fa-eye text-sm" />
                    </button>
                    {row.status === 'PENDING' && (
                        <button
                            onClick={() => {
                                if (confirm('Hủy đơn nghỉ phép này?')) {
                                    cancelMutation.mutate(row.leaveRequestId);
                                }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                            title="Hủy đơn"
                        >
                            <i className="fa-solid fa-trash text-sm" />
                        </button>
                    )}
                </div>
            )
        },
    ];

    return (
        <div className="space-y-4">
            {/* Leave Balance Card */}
            {remaining != null && (
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                            <i className="fa-solid fa-umbrella-beach text-gray-400 text-2xl" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Phép năm {new Date().getFullYear()}</p>
                            <p className="text-3xl font-semibold text-gray-900 mt-1">{remaining} <span className="text-base font-normal text-gray-400">/{total} ngày</span></p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Đã dùng</p>
                        <p className="text-2xl font-semibold text-gray-900">{used}</p>
                        <div className="w-32 bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div className="h-full bg-gray-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 flex items-center gap-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <i className="fa-solid fa-clock text-gray-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-semibold text-gray-900">{pending}</p>
                        <p className="text-xs text-gray-500">Chờ duyệt</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 flex items-center gap-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <i className="fa-solid fa-check-circle text-gray-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-semibold text-gray-900">{approved}</p>
                        <p className="text-xs text-gray-500">Đã duyệt</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 flex items-center gap-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <i className="fa-solid fa-xmark-circle text-gray-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-semibold text-gray-900">{rejected}</p>
                        <p className="text-xs text-gray-500">Từ chối</p>
                    </div>
                </div>
            </div>

            <DataTable columns={columns} data={requests} loading={isLoading} />

            {detailModal && (
                <LeaveDetailModal
                    request={detailModal}
                    onClose={() => setDetailModal(null)}
                />
            )}
        </div>
    );
}

// ─── Pending Approval ────────────────────────────────────────────────────────

function PendingLeaveRequests() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [approvalModal, setApprovalModal] = useState(null);
    const [detailModal, setDetailModal] = useState(null);

    const { data: requests, isLoading } = useQuery({
        queryKey: ['pending-leave-requests'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.LEAVE_REQUESTS.PENDING, {
                params: { size: 100 }
            });
            return res.data?.content || res.data || [];
        },
    });

    const approveMutation = useMutation({
        mutationFn: ({ id, note }) => apiClient.patch(ENDPOINTS.LEAVE_REQUESTS.APPROVE(id), { note }),
        onSuccess: () => {
            showToast('Đã duyệt đơn', 'success');
            queryClient.invalidateQueries(['pending-leave-requests']);
            setApprovalModal(null);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Lỗi duyệt', 'error'),
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, note }) => apiClient.patch(ENDPOINTS.LEAVE_REQUESTS.REJECT(id), { note }),
        onSuccess: () => {
            showToast('Đã từ chối đơn', 'success');
            queryClient.invalidateQueries(['pending-leave-requests']);
            setApprovalModal(null);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Lỗi từ chối', 'error'),
    });

    const data = Array.isArray(requests) ? requests : requests?.content || [];

    const handleSelectAll = () => {
        if (selectedIds.size === data.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(data.map(r => r.leaveRequestId)));
    };

    const handleSelectOne = (id) => {
        const ns = new Set(selectedIds);
        ns.has(id) ? ns.delete(id) : ns.add(id);
        setSelectedIds(ns);
    };

    const openApprovalModal = (row, action) => {
        setApprovalModal({
            id: row.leaveRequestId,
            action,
            name: row.employee?.fullName || 'Nhân viên',
            type: row.leaveType,
            days: row.totalDays,
            startDate: row.startDate,
            endDate: row.endDate,
            reason: row.reason,
        });
    };

    const handleConfirmApproval = (note) => {
        if (!approvalModal) return;
        if (approvalModal.action === 'approve') {
            approveMutation.mutate({ id: approvalModal.id, note });
        } else {
            if (!note && approvalModal.action === 'reject') {
                showToast('Vui lòng nhập lý do từ chối', 'error');
                return;
            }
            rejectMutation.mutate({ id: approvalModal.id, note });
        }
    };

    const handleBatchApprove = () => {
        if (!confirm(`Duyệt tất cả ${selectedIds.size} đơn?`)) return;
        selectedIds.forEach(id => approveMutation.mutate({ id, note: '' }));
        setSelectedIds(new Set());
    };

    const handleBatchReject = () => {
        const reason = window.prompt(`Từ chối ${selectedIds.size} đơn — nhập lý do chung (tùy chọn):`);
        if (reason === null) return;
        selectedIds.forEach(id => rejectMutation.mutate({ id, note: reason }));
        setSelectedIds(new Set());
    };

    const columns = [
        {
            header: () => (
                <input type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === data.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300"
                />
            ),
            accessorKey: 'select',
            cell: (row) => (
                <input type="checkbox"
                    checked={selectedIds.has(row.leaveRequestId)}
                    onChange={() => handleSelectOne(row.leaveRequestId)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300"
                />
            )
        },
        {
            header: 'Nhân viên',
            accessorKey: 'employee',
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-medium">
                        {(row.employee?.fullName || '?')[0].toUpperCase()}
                    </div>
                    <div>
                        <div className="font-medium text-sm text-gray-900">{row.employee?.fullName}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Loại nghỉ',
            accessorKey: 'leaveType',
            cell: (row) => <LeaveTypeBadge type={row.leaveType || row.type} />
        },
        {
            header: 'Thời gian',
            accessorKey: 'dateRange',
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-700">{formatDate(row.startDate)} → {formatDate(row.endDate)}</span>
                    <span className="text-[10px] text-gray-400">{row.totalDays} ngày</span>
                </div>
            )
        },
        {
            header: 'Lý do',
            accessorKey: 'reason',
            cell: (row) => (
                <span className="truncate max-w-[150px] block text-xs text-gray-500" title={row.reason}>
                    {row.reason || '—'}
                </span>
            )
        },
        {
            header: 'Trạng thái',
            accessorKey: 'status',
            cell: (row) => <StatusBadge status={row.status} />
        },
        {
            header: 'Thao tác',
            accessorKey: 'actions',
            cell: (row) => (
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setDetailModal(row)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                        title="Chi tiết"
                    >
                        <i className="fa-solid fa-eye text-sm" />
                    </button>
                    <button
                        onClick={() => openApprovalModal(row, 'approve')}
                        className="p-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded transition-all"
                        title="Duyệt"
                    >
                        <i className="fa-solid fa-check text-sm" />
                    </button>
                    <button
                        onClick={() => openApprovalModal(row, 'reject')}
                        className="p-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded transition-all"
                        title="Từ chối"
                    >
                        <i className="fa-solid fa-xmark text-sm" />
                    </button>
                </div>
            )
        },
    ];

    return (
        <div className="space-y-4">
            {selectedIds.size > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-gray-900 font-medium">
                        Đã chọn {selectedIds.size} đơn
                    </span>
                    <div className="flex gap-2">
                        <button onClick={handleBatchApprove}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors">
                            <i className="fa-solid fa-check mr-1" /> Duyệt tất cả
                        </button>
                        <button onClick={handleBatchReject}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors">
                            <i className="fa-solid fa-xmark mr-1" /> Từ chối tất cả
                        </button>
                        <button onClick={() => setSelectedIds(new Set())}
                            className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm transition-colors">
                            Bỏ chọn
                        </button>
                    </div>
                </div>
            )}

            {data.length === 0 && !isLoading && (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                    <i className="fa-solid fa-inbox text-4xl text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">Không có đơn nào cần duyệt</p>
                    <p className="text-sm text-gray-400 mt-1">Tất cả đơn đều đã được xử lý</p>
                </div>
            )}

            <DataTable columns={columns} data={data} loading={isLoading} />

            {/* Approval Modal */}
            {approvalModal && (
                <ApprovalModal
                    modal={approvalModal}
                    onClose={() => setApprovalModal(null)}
                    onConfirm={handleConfirmApproval}
                    isLoading={approveMutation.isPending || rejectMutation.isPending}
                />
            )}

            {detailModal && (
                <LeaveDetailModal
                    request={detailModal}
                    onClose={() => setDetailModal(null)}
                />
            )}
        </div>
    );
}

function ApprovalModal({ modal, onClose, onConfirm, isLoading }) {
    const [note, setNote] = useState('');
    const isReject = modal.action === 'reject';
    const isApprove = modal.action === 'approve';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={`flex items-center gap-3 px-6 py-4 rounded-t-2xl ${isApprove ? 'bg-green-600' : 'bg-red-600'}`}>
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <i className={`fa-solid ${isApprove ? 'fa-check' : 'fa-xmark'} text-white`} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">
                            {isApprove ? 'Duyệt đơn nghỉ phép' : 'Từ chối đơn nghỉ phép'}
                        </h2>
                        <p className="text-white/80 text-sm">{modal.name}</p>
                    </div>
                    <button onClick={onClose} className="ml-auto text-white/70 hover:text-white">
                        <i className="fa-solid fa-times text-lg" />
                    </button>
                </div>

                {/* Info */}
                <div className="px-6 py-4 space-y-3 border-b border-gray-100">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-gray-500 text-xs">Loại nghỉ</span>
                            <p className="font-medium mt-0.5"><LeaveTypeBadge type={modal.type} /></p>
                        </div>
                        <div>
                            <span className="text-gray-500 text-xs">Số ngày</span>
                            <p className="font-medium mt-0.5 text-gray-900">{modal.days} ngày</p>
                        </div>
                        <div>
                            <span className="text-gray-500 text-xs">Từ ngày</span>
                            <p className="font-medium mt-0.5 text-gray-900">{formatDate(modal.startDate)}</p>
                        </div>
                        <div>
                            <span className="text-gray-500 text-xs">Đến ngày</span>
                            <p className="font-medium mt-0.5 text-gray-900">{formatDate(modal.endDate)}</p>
                        </div>
                    </div>
                    {modal.reason && (
                        <div>
                            <span className="text-gray-500 text-xs">Lý do</span>
                            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{modal.reason}</p>
                        </div>
                    )}
                </div>

                {/* Note */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {isReject ? 'Lý do từ chối' : 'Ghi chú (tùy chọn)'}
                            {isReject && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300 resize-none bg-white"
                            rows={isReject ? 3 : 2}
                            placeholder={isReject ? 'Nhập lý do từ chối...' : 'Ghi chú khi duyệt (tùy chọn)...'}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={() => onConfirm(note)}
                            disabled={isReject && !note.trim() || isLoading}
                            className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors disabled:opacity-50
                                ${isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            {isLoading ? (
                                <><i className="fa-solid fa-spinner fa-spin mr-2" />Đang xử lý...</>
                            ) : (
                                <>{isApprove ? 'Duyệt đơn' : 'Từ chối'}</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Leave Detail Modal ────────────────────────────────────────────────────

function LeaveDetailModal({ request, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm">
                            {(request.employee?.fullName || '?')[0].toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">{request.employee?.fullName || '—'}</h2>
                            <p className="text-xs text-gray-500">Chi tiết đơn nghỉ phép</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <StatusBadge status={request.status} />
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <i className="fa-solid fa-times text-lg" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-gray-500">Loại nghỉ</span>
                            <div className="mt-1"><LeaveTypeBadge type={request.leaveType || request.type} /></div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500">Số ngày nghỉ</span>
                            <p className="mt-1 text-sm font-semibold text-gray-900">{request.totalDays} ngày</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500">Từ ngày</span>
                            <p className="mt-1 text-sm font-medium text-gray-900">{formatDate(request.startDate)}</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500">Đến ngày</span>
                            <p className="mt-1 text-sm font-medium text-gray-900">{formatDate(request.endDate)}</p>
                        </div>
                        {request.projectName && (
                            <div>
                                <span className="text-xs text-gray-500">Dự án liên quan</span>
                                <p className="mt-1 text-sm font-medium text-gray-900">{request.projectName}</p>
                            </div>
                        )}
                        <div>
                            <span className="text-xs text-gray-500">Ngày tạo</span>
                            <p className="mt-1 text-sm text-gray-900">{formatDateTime(request.createdAt)}</p>
                        </div>
                    </div>

                    {request.reason && (
                        <div>
                            <span className="text-xs text-gray-500">Lý do</span>
                            <p className="mt-1 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{request.reason}</p>
                        </div>
                    )}

                    {(request.approverName || request.approvalNote) && (
                        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-2">
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Kết quả phê duyệt</h4>
                            {request.approverName && (
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-user-check text-gray-400 text-sm" />
                                    <span className="text-sm text-gray-700">Bởi <strong>{request.approverName}</strong></span>
                                </div>
                            )}
                            {request.approvedAt && (
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-calendar-check text-gray-400 text-sm" />
                                    <span className="text-xs text-gray-500">{formatDateTime(request.approvedAt)}</span>
                                </div>
                            )}
                            {request.approvalNote && (
                                <div className="flex items-start gap-2">
                                    <i className="fa-solid fa-comment text-gray-400 text-sm mt-0.5" />
                                    <span className="text-sm text-gray-700">"{request.approvalNote}"</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Create Leave Modal ────────────────────────────────────────────────────

function CreateLeaveModal({ isOpen, onClose }) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const mutation = useMutation({
        mutationFn: (data) => apiClient.post(ENDPOINTS.LEAVE_REQUESTS.CREATE, data),
        onSuccess: () => {
            showToast('Gửi đơn xin nghỉ thành công', 'success');
            queryClient.invalidateQueries(['my-leave-requests']);
            onClose();
        },
        onError: (err) => showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error')
    });

    // Fetch user's projects
    const { data: projects = [] } = useQuery({
        queryKey: ['my-projects-leave'],
        queryFn: async () => {
            const res = (await apiClient.get(ENDPOINTS.PROJECTS.MY_PROJECTS)).data;
            return Array.isArray(res) ? res : (res?.content || []);
        },
        enabled: isOpen,
    });

    // Fetch leave balance
    const { data: balance } = useQuery({
        queryKey: ['leave-balance'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.LEAVE_REQUESTS.MY_BALANCE);
            return res.data;
        },
        enabled: isOpen,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        mutation.mutate({
            leaveType: fd.get('leaveType'),
            startDate: fd.get('startDate'),
            endDate: fd.get('endDate'),
            reason: fd.get('reason'),
            projectId: fd.get('projectId') ? Number(fd.get('projectId')) : null,
            projectName: projects.find(p => String(p.projectId) === fd.get('projectId'))?.name || null,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">Tạo đơn xin nghỉ</h2>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <i className="fa-solid fa-xmark text-xl" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {balance && balance.remainingDays != null && (
                            <div className="bg-gray-50 border border-gray-100 text-gray-700 p-3 rounded-lg text-sm flex items-center gap-2 font-medium">
                                <i className="fa-solid fa-umbrella-beach text-gray-400" />
                                <span>Ngày phép còn lại: <strong>{balance.remainingDays}</strong> / {balance.totalDays || 12} ngày</span>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Loại nghỉ <span className="text-red-500">*</span></label>
                            <select name="leaveType" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-300 bg-white" required>
                                <option value="ANNUAL">Nghỉ phép năm</option>
                                <option value="SICK">Nghỉ ốm</option>
                                <option value="UNPAID">Nghỉ không lương</option>
                                <option value="MATERNITY">Thai sản</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Từ ngày <span className="text-red-500">*</span></label>
                                <input type="date" name="startDate" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-300 bg-white" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Đến ngày <span className="text-red-500">*</span></label>
                                <input type="date" name="endDate" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-300 bg-white" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lý do <span className="text-red-500">*</span></label>
                            <textarea name="reason" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-300 resize-none bg-white" rows="3" required placeholder="Nhập lý do nghỉ..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Dự án liên quan (tùy chọn)</label>
                            <select name="projectId" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-300 bg-white">
                                <option value="">-- Không chọn --</option>
                                {projects.map(p => (
                                    <option key={p.projectId} value={p.projectId}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">Hủy</button>
                        <button type="submit" disabled={mutation.isPending} className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors disabled:opacity-50">
                            {mutation.isPending ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Đang xử lý...</> : 'Gửi đơn'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Leave Calendar ──────────────────────────────────────────────────────────

function LeaveCalendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Query a wider range: 3 months back to 1 month ahead to capture events from past months
    const rangeStart = new Date(year, month - 3, 1);
    const rangeEnd = new Date(year, month + 2, 0);

    const { data: leaveRequests = [] } = useQuery({
        queryKey: ['leave-calendar', month, year],
        queryFn: async () => {
            const startDate = rangeStart.toISOString().split('T')[0];
            const endDate = rangeEnd.toISOString().split('T')[0];
            const res = await apiClient.get(ENDPOINTS.LEAVE_REQUESTS.TEAM_CALENDAR, {
                params: { startDate, endDate },
            });
            return Array.isArray(res.data) ? res.data : [];
        },
        staleTime: 60_000,
    });

    const leaveDays = {};
    leaveRequests.forEach(req => {
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const key = d.toDateString();
            if (!leaveDays[key]) leaveDays[key] = [];
            leaveDays[key].push(req);
        }
    });

    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const days = [
        ...Array(startPadding).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => {
            const d = new Date(year, month, i + 1);
            return { day: i + 1, date: d, leaves: leaveDays[d.toDateString()] || [] };
        }),
    ];

    const goToPrev = () => setCurrentMonth(new Date(year, month - 1, 1));
    const goToNext = () => setCurrentMonth(new Date(year, month + 1, 1));

    const LEAVE_COLORS = {
        ANNUAL: 'bg-gray-100 text-gray-700 border-gray-200',
        SICK: 'bg-red-50 text-red-700 border-red-100',
        UNPAID: 'bg-gray-100 text-gray-600 border-gray-200',
        MATERNITY: 'bg-pink-50 text-pink-700 border-pink-100',
        OTHER: 'bg-gray-100 text-gray-600 border-gray-200',
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <button onClick={goToPrev} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <i className="fa-solid fa-chevron-left text-gray-400" />
                    </button>
                    <h3 className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
                        {formatDate(currentMonth, { month: 'long', year: 'numeric' })}
                    </h3>
                    <button onClick={goToNext} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <i className="fa-solid fa-chevron-right text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 mb-2">
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">{day}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for padding */}
                {Array(startPadding).fill(null).map((_, i) => (
                    <div key={`pad-${i}`} className="h-24 bg-gray-50 rounded-lg" />
                ))}
                {days.slice(startPadding).map((item) => {
                    const isToday = item.date.toDateString() === new Date().toDateString();
                    const isWeekend = item.date.getDay() === 0 || item.date.getDay() === 6;
                    return (
                        <div key={item.day}
                            className={`h-24 p-2 rounded-lg border transition-all overflow-hidden
                                ${isWeekend ? 'bg-gray-50' : 'bg-white'}
                                ${isToday ? 'ring-2 ring-gray-400 ring-offset-1' : 'border-gray-100'}`}>
                            <div className={`text-sm font-medium mb-1 ${isToday ? 'text-gray-900' : isWeekend ? 'text-gray-400' : 'text-gray-600'}`}>
                                {item.day}
                            </div>
                            <div className="space-y-0.5">
                                {item.leaves.slice(0, 2).map((leave, i) => (
                                    <div key={i}
                                        className={`text-[10px] px-1.5 py-0.5 rounded truncate border ${LEAVE_COLORS[leave.leaveType || leave.type] || LEAVE_COLORS.OTHER}`}
                                        title={`${leave.employee?.fullName || 'User'} - ${leave.leaveType || leave.type}`}>
                                        {leave.employee?.fullName?.split(' ').pop() || 'User'}
                                    </div>
                                ))}
                                {item.leaves.length > 2 && (
                                    <div className="text-[10px] text-gray-400 px-1">+{item.leaves.length - 2}</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-100">
                {Object.entries({
                    'Nghỉ phép': 'bg-gray-100 border-gray-200 text-gray-700',
                    'Nghỉ ốm': 'bg-red-50 border-red-100 text-red-700',
                    'Không lương': 'bg-gray-100 border-gray-200 text-gray-600',
                    'Thai sản': 'bg-pink-50 border-pink-100 text-pink-700',
                }).map(([label, cls]) => (
                    <div key={label} className="flex items-center gap-2 text-sm">
                        <div className={`w-4 h-4 rounded border ${cls}`} />
                        <span className="text-gray-600">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

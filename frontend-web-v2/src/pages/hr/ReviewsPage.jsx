import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatNumber } from '@shared/utils/formatters';
import DataTable from '@shared/components/ui/DataTable';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import ReviewFormModal from './components/ReviewFormModal';
import BulkReviewModal from './components/BulkReviewModal';

export default function ReviewsPage() {
    const [activeTab, setActiveTab] = useState('all-reviews');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [editingReview, setEditingReview] = useState(null);

    const currentWorkspace = useWorkspaceStore(state => state.currentWorkspace);
    // Backend Lombok serializes `boolean isOwner` as JSON key "owner" (strips "is" prefix)
    // Also check roles array as ultimate fallback
    const isOwner = !!(currentWorkspace?.isOwner || currentWorkspace?.owner
        || currentWorkspace?.roles?.includes('OWNER')
        || currentWorkspace?.role === 'OWNER');
    const canCreate = isOwner || !!(currentWorkspace?.permissions?.reviewCreate);
    const canApprove = isOwner || !!(currentWorkspace?.permissions?.reviewApprove);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-100 px-6 py-5 shadow-sm">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-clipboard-check text-gray-400 text-xl" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">Đánh giá nhân viên</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Quản lý hiệu suất và đánh giá định kỳ</p>
                        </div>
                    </div>
                    {canCreate && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors text-sm shadow-sm"
                            >
                                <i className="fa-solid fa-layer-group mr-2" /> Tạo hàng loạt
                            </button>
                            <button onClick={() => setShowCreateModal(true)} className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-medium shadow-sm transition-colors">
                                <i className="fa-solid fa-plus mr-2" /> Tạo đánh giá
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <ReviewStats />

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-100 px-4 shadow-sm">
                <nav className="flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('all-reviews')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'all-reviews' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Tất cả đánh giá
                    </button>
                    {canApprove && (
                        <button
                            onClick={() => setActiveTab('pending-approval')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'pending-approval' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Chờ duyệt
                            <span className="ml-1 bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-xs font-medium">!</span>
                        </button>
                    )}
                </nav>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'all-reviews' && (
                    <AllReviewsTable
                        onEdit={(review) => { setEditingReview(review); setShowCreateModal(true); }}
                        canCreate={canCreate}
                        canApprove={canApprove}
                    />
                )}
                {activeTab === 'pending-approval' && (
                    <PendingReviewsTable canApprove={canApprove} />
                )}
            </div>

            {/* Modal */}
            {showCreateModal && (
                <ReviewFormModal
                    isOpen={showCreateModal}
                    onClose={() => { setShowCreateModal(false); setEditingReview(null); }}
                    review={editingReview}
                />
            )}
            {showBulkModal && (
                <BulkReviewModal
                    isOpen={showBulkModal}
                    onClose={() => setShowBulkModal(false)}
                />
            )}
        </div>
    );
}

// Stats Cards Component
function ReviewStats() {
    const { data: reviews } = useQuery({
        queryKey: ['reviews-stats'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.REVIEWS.LIST)).data,
        retry: false,
    });

    const reviewList = Array.isArray(reviews) ? reviews : reviews?.content || [];

    const stats = {
        total: reviewList.length,
        pending: reviewList.filter(r => r.status === 'PENDING').length,
        approved: reviewList.filter(r => r.status === 'APPROVED').length,
        inProgress: reviewList.filter(r => r.status === 'IN_PROGRESS').length,
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
                label="Tổng đánh giá"
                value={stats.total}
                icon="fa-clipboard-list"
            />
            <StatCard
                label="Chờ duyệt"
                value={stats.pending}
                icon="fa-clock"
                accent
            />
            <StatCard
                label="Đã duyệt"
                value={stats.approved}
                icon="fa-check-circle"
                success
            />
            <StatCard
                label="Bản nháp"
                value={stats.inProgress}
                icon="fa-file-pen"
            />
        </div>
    );
}

function StatCard({ label, value, icon, accent, success }) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{label}</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${accent ? 'bg-amber-50' : success ? 'bg-green-50' : 'bg-gray-100'} flex items-center justify-center`}>
                    <i className={`fa-solid ${icon} ${accent ? 'text-amber-500' : success ? 'text-green-500' : 'text-gray-400'}`} />
                </div>
            </div>
        </div>
    );
}

// All Reviews Table
function AllReviewsTable({ onEdit, canCreate, canApprove }) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const { data: reviews, isLoading, error } = useQuery({
        queryKey: ['reviews'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.REVIEWS.LIST)).data,
        retry: false,
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => apiClient.delete(ENDPOINTS.REVIEWS.DELETE(id)),
        onSuccess: () => {
            showToast('Đã xóa đánh giá', 'success');
            queryClient.invalidateQueries(['reviews']);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error')
    });

    const submitMutation = useMutation({
        mutationFn: (id) => apiClient.patch(ENDPOINTS.REVIEWS.SUBMIT(id)),
        onSuccess: () => {
            showToast('Đã gửi duyệt đánh giá', 'success');
            queryClient.invalidateQueries(['reviews']);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error')
    });

    const approveMutation = useMutation({
        mutationFn: (id) => apiClient.patch(ENDPOINTS.REVIEWS.APPROVE(id), {}),
        onSuccess: () => {
            showToast('Đã duyệt đánh giá', 'success');
            queryClient.invalidateQueries(['reviews']);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error')
    });

    if (error) {
        const status = error?.response?.status;
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <i className="fa-solid fa-triangle-exclamation text-red-400 text-xl" />
                </div>
                <p className="text-gray-700 font-medium">
                    {status === 403 ? 'Bạn không có quyền xem danh sách đánh giá' : 'Không thể tải dữ liệu'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                    {status === 403 ? 'Vui lòng liên hệ quản trị viên để được cấp quyền' : `Lỗi: ${error?.message}`}
                </p>
            </div>
        );
    }

    const columns = [
        {
            header: 'Nhân viên',
            accessorKey: 'employeeName',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm">
                        {(row.employeeName || row.employee?.fullName || 'N')?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{row.employeeName || row.employee?.fullName}</div>
                        <div className="text-xs text-gray-500">{row.employee?.position?.name || ''}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Kỳ đánh giá',
            accessorKey: 'reviewPeriod',
            cell: (row) => (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium">
                    {row.reviewPeriod}
                    {row.projectName && (
                        <span className="ml-1 text-xs text-gray-400" title={row.projectName}>
                            · {row.projectName}
                        </span>
                    )}
                </span>
            )
        },
        {
            header: 'Loại',
            accessorKey: 'reviewType',
            cell: (row) => <ReviewTypeBadge type={row.reviewType} />
        },
        {
            header: 'Điểm TB',
            accessorKey: 'averageScore',
            cell: (row) => {
                const scores = [row.technicalScore, row.attitudeScore, row.teamworkScore, row.softSkillsScore].filter(s => s != null);
                const avg = scores.length > 0 ? formatNumber(scores.reduce((a, b) => a + b, 0) / scores.length, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-';
                return <ScoreBadge score={avg} />;
            }
        },
        {
            header: 'Xếp hạng',
            accessorKey: 'finalRank',
            cell: (row) => <RankBadge rank={row.finalRank} />
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
                <div className="flex justify-end gap-1">
                    <button
                        onClick={() => onEdit(row)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                        title="Xem chi tiết"
                    >
                        <i className="fa-solid fa-eye text-sm" />
                    </button>

                    {canCreate && row.status === 'IN_PROGRESS' && (
                        <button
                            onClick={() => onEdit(row)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                            title="Chỉnh sửa"
                        >
                            <i className="fa-solid fa-pen text-sm" />
                        </button>
                    )}

                    {canCreate && row.status === 'IN_PROGRESS' && (
                        <button
                            onClick={() => submitMutation.mutate(row.reviewId || row.id)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all"
                            title="Gửi duyệt"
                        >
                            <i className="fa-solid fa-paper-plane text-sm" />
                        </button>
                    )}

                    {canApprove && row.status === 'PENDING' && (
                        <button
                            onClick={() => approveMutation.mutate(row.reviewId || row.id)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-all"
                            title="Duyệt"
                        >
                            <i className="fa-solid fa-check text-sm" />
                        </button>
                    )}

                    {canCreate && row.status === 'IN_PROGRESS' && (
                        <button
                            onClick={() => {
                                if (window.confirm('Xác nhận xóa đánh giá này?')) {
                                    deleteMutation.mutate(row.reviewId || row.id);
                                }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                            title="Xóa"
                        >
                            <i className="fa-solid fa-trash text-sm" />
                        </button>
                    )}
                </div>
            )
        }
    ];

    const data = Array.isArray(reviews) ? reviews : reviews?.content || [];

    return <DataTable columns={columns} data={data} loading={isLoading} />;
}

// Pending Reviews Table
function PendingReviewsTable({ canApprove }) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    const { data: reviews, isLoading } = useQuery({
        queryKey: ['pending-reviews'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.REVIEWS.PENDING);
            return res.data || [];
        },
        enabled: canApprove,
        retry: false,
    });

    const approveMutation = useMutation({
        mutationFn: (id) => apiClient.patch(ENDPOINTS.REVIEWS.APPROVE(id), {}),
        onSuccess: () => {
            showToast('Đã duyệt đánh giá', 'success');
            queryClient.invalidateQueries(['pending-reviews']);
            queryClient.invalidateQueries(['reviews']);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error')
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }) => apiClient.patch(ENDPOINTS.REVIEWS.REJECT(id), { reason }),
        onSuccess: () => {
            showToast('Đã từ chối đánh giá', 'success');
            queryClient.invalidateQueries(['pending-reviews']);
            queryClient.invalidateQueries(['reviews']);
            setRejectingId(null);
            setRejectReason('');
        },
        onError: (err) => showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error')
    });

    const handleReject = () => {
        if (!rejectReason.trim()) {
            showToast('Vui lòng nhập lý do từ chối', 'warning');
            return;
        }
        rejectMutation.mutate({ id: rejectingId, reason: rejectReason });
    };

    const columns = [
        {
            header: 'Nhân viên',
            accessorKey: 'employeeName',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm">
                        {(row.employeeName || row.employee?.fullName || 'N')?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{row.employeeName || row.employee?.fullName}</div>
                        <div className="text-xs text-gray-500">{row.employee?.department?.name}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Kỳ đánh giá',
            accessorKey: 'reviewPeriod',
            cell: (row) => <span className="font-medium text-gray-700">{row.reviewPeriod}</span>
        },
        {
            header: 'Loại',
            accessorKey: 'reviewType',
            cell: (row) => <ReviewTypeBadge type={row.reviewType} />
        },
        {
            header: 'Điểm TB',
            accessorKey: 'averageScore',
            cell: (row) => {
                const scores = [row.technicalScore, row.attitudeScore, row.teamworkScore, row.leadershipScore].filter(s => s != null);
                const avg = scores.length > 0 ? formatNumber(scores.reduce((a, b) => a + b, 0) / scores.length, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-';
                return <ScoreBadge score={avg} />;
            }
        },
        {
            header: 'Người đánh giá',
            accessorKey: 'reviewer',
            cell: (row) => (
                <span className="text-gray-600">{row.reviewer?.fullName || row.reviewerName || '-'}</span>
            )
        },
        {
            header: 'Thao tác',
            accessorKey: 'actions',
            cell: (row) => canApprove && (
                <div className="flex gap-1.5">
                    <button
                        onClick={() => approveMutation.mutate(row.reviewId || row.id)}
                        disabled={approveMutation.isPending}
                        className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        <i className="fa-solid fa-check mr-1" /> Duyệt
                    </button>
                    <button
                        onClick={() => setRejectingId(row.reviewId || row.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                    >
                        <i className="fa-solid fa-xmark mr-1" /> Từ chối
                    </button>
                </div>
            )
        }
    ];

    const data = Array.isArray(reviews) ? reviews : reviews?.content || [];

    return (
        <>
            <DataTable columns={columns} data={data} loading={isLoading} />

            {/* Reject Modal */}
            {rejectingId && (
                <div className="modal-overlay">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRejectingId(null)} />
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">Từ chối đánh giá</h3>
                            <button onClick={() => setRejectingId(null)} className="text-gray-400 hover:text-gray-600">
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lý do từ chối <span className="text-red-500">*</span></label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-300 resize-none bg-white"
                                rows="3"
                                placeholder="Nhập lý do từ chối..."
                            />
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setRejectingId(null)} className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">Hủy</button>
                            <button
                                onClick={handleReject}
                                disabled={rejectMutation.isPending}
                                className="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {rejectMutation.isPending ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Đang xử lý...</> : 'Xác nhận từ chối'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Badge Components
function StatusBadge({ status }) {
    const styles = {
        IN_PROGRESS: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Đang đánh giá' },
        PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Chờ duyệt' },
        APPROVED: { bg: 'bg-green-50', text: 'text-green-700', label: 'Đã duyệt' },
        REJECTED: { bg: 'bg-red-50', text: 'text-red-700', label: 'Từ chối' },
    };
    const s = styles[status] || styles.IN_PROGRESS;
    return <span className={`inline-flex items-center gap-1 ${s.bg} ${s.text} text-xs px-2 py-1 rounded-md font-medium`}>{s.label}</span>;
}

function ReviewTypeBadge({ type }) {
    const styles = {
        SPRINT_REVIEW:      { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Sprint Review' },
        PROJECT_COMPLETION: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Kết thúc dự án' },
        PERIODIC:           { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Định kỳ' },
        PROJECT:            { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Dự án' },
        PROMOTION:          { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Thăng chức' },
    };
    const s = styles[type] || { bg: 'bg-gray-100', text: 'text-gray-700', label: type };
    return <span className={`inline-flex items-center gap-1 ${s.bg} ${s.text} text-xs px-2 py-1 rounded-md font-medium`}>{s.label}</span>;
}

function RankBadge({ rank }) {
    const styles = {
        A: { bg: 'bg-green-50', text: 'text-green-700' },
        B: { bg: 'bg-gray-100', text: 'text-gray-700' },
        C: { bg: 'bg-amber-50', text: 'text-amber-700' },
        D: { bg: 'bg-red-50', text: 'text-red-700' },
    };
    const s = styles[rank] || { bg: 'bg-gray-100', text: 'text-gray-700' };

    if (!rank) return <span className="text-gray-400">-</span>;

    return (
        <span className={`${s.bg} ${s.text} font-semibold text-sm w-8 h-8 flex items-center justify-center rounded-full`}>
            {rank}
        </span>
    );
}

function ScoreBadge({ score }) {
    if (score === '-' || score == null) return <span className="text-gray-400">-</span>;

    const numScore = parseFloat(score);
    let color = 'text-gray-700';
    if (numScore >= 8) color = 'text-green-600';
    else if (numScore >= 6) color = 'text-gray-900';
    else if (numScore >= 4) color = 'text-amber-600';
    else color = 'text-red-600';

    return <span className={`font-semibold ${color}`}>{score}</span>;
}

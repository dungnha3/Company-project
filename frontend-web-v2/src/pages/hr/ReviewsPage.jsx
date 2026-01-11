import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import DataTable from '@shared/components/ui/DataTable';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import ReviewFormModal from './components/ReviewFormModal';

export default function ReviewsPage() {
    const { hasRole } = useWorkspaceStore();
    const [activeTab, setActiveTab] = useState('all-reviews');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingReview, setEditingReview] = useState(null);

    const isManager = hasRole('MANAGER_HR', 'OWNER', 'ADMIN');
    const canApprove = hasRole('OWNER', 'ADMIN');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Đánh giá nhân viên</h1>
                    <p className="text-gray-500 text-sm">Quản lý hiệu suất và đánh giá định kỳ</p>
                </div>
                {isManager && (
                    <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                        <i className="fa-solid fa-plus mr-2" /> Tạo đánh giá
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <ReviewStats />

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('all-reviews')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'all-reviews' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Tất cả đánh giá
                    </button>
                    {canApprove && (
                        <button
                            onClick={() => setActiveTab('pending-approval')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'pending-approval' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Chờ duyệt <span className="ml-2 bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs">!</span>
                        </button>
                    )}
                </nav>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'all-reviews' && (
                    <AllReviewsTable
                        onEdit={(review) => { setEditingReview(review); setShowCreateModal(true); }}
                        isManager={isManager}
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
        </div>
    );
}

// Stats Cards Component
function ReviewStats() {
    const { data: reviews } = useQuery({
        queryKey: ['reviews-stats'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.REVIEWS.LIST)).data,
    });

    const reviewList = Array.isArray(reviews) ? reviews : reviews?.content || [];

    const stats = {
        total: reviewList.length,
        pending: reviewList.filter(r => r.status === 'PENDING_APPROVAL').length,
        approved: reviewList.filter(r => r.status === 'APPROVED').length,
        draft: reviewList.filter(r => r.status === 'DRAFT').length,
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
                label="Tổng đánh giá"
                value={stats.total}
                icon="fa-clipboard-list"
                color="bg-blue-100 text-blue-600"
            />
            <StatCard
                label="Chờ duyệt"
                value={stats.pending}
                icon="fa-clock"
                color="bg-orange-100 text-orange-600"
            />
            <StatCard
                label="Đã duyệt"
                value={stats.approved}
                icon="fa-check-circle"
                color="bg-green-100 text-green-600"
            />
            <StatCard
                label="Bản nháp"
                value={stats.draft}
                icon="fa-file-pen"
                color="bg-gray-100 text-gray-600"
            />
        </div>
    );
}

function StatCard({ label, value, icon, color }) {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                    <i className={`fa-solid ${icon}`} />
                </div>
            </div>
        </div>
    );
}

// All Reviews Table
function AllReviewsTable({ onEdit, isManager, canApprove }) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const { data: reviews, isLoading } = useQuery({
        queryKey: ['reviews'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.REVIEWS.LIST)).data,
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

    const columns = [
        {
            header: 'Nhân viên',
            accessorKey: 'employeeName',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {(row.employeeName || row.employee?.fullName || 'N')?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900">{row.employeeName || row.employee?.fullName}</div>
                        <div className="text-xs text-gray-500">{row.employee?.position?.name || ''}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Kỳ đánh giá',
            accessorKey: 'reviewPeriod',
            cell: (row) => (
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium">
                    {row.reviewPeriod}
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
                const scores = [row.technicalScore, row.attitudeScore, row.teamworkScore, row.leadershipScore].filter(s => s != null);
                const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';
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
                <div className="flex justify-end gap-2">
                    {/* View */}
                    <button
                        className="btn-xs bg-gray-100 text-gray-600 hover:bg-gray-200 rounded px-2 py-1"
                        title="Xem chi tiết"
                    >
                        <i className="fa-solid fa-eye" />
                    </button>

                    {/* Edit (for DRAFT only) */}
                    {isManager && row.status === 'DRAFT' && (
                        <button
                            onClick={() => onEdit(row)}
                            className="btn-xs bg-blue-100 text-blue-600 hover:bg-blue-200 rounded px-2 py-1"
                            title="Chỉnh sửa"
                        >
                            <i className="fa-solid fa-pen" />
                        </button>
                    )}

                    {/* Submit for approval (for DRAFT) */}
                    {isManager && row.status === 'DRAFT' && (
                        <button
                            onClick={() => submitMutation.mutate(row.reviewId || row.id)}
                            className="btn-xs bg-orange-100 text-orange-600 hover:bg-orange-200 rounded px-2 py-1"
                            title="Gửi duyệt"
                        >
                            <i className="fa-solid fa-paper-plane" />
                        </button>
                    )}

                    {/* Approve (for PENDING) */}
                    {canApprove && row.status === 'PENDING_APPROVAL' && (
                        <button
                            onClick={() => approveMutation.mutate(row.reviewId || row.id)}
                            className="btn-xs bg-green-100 text-green-600 hover:bg-green-200 rounded px-2 py-1"
                            title="Duyệt"
                        >
                            <i className="fa-solid fa-check" />
                        </button>
                    )}

                    {/* Delete (for DRAFT only) */}
                    {isManager && row.status === 'DRAFT' && (
                        <button
                            onClick={() => {
                                if (window.confirm('Xác nhận xóa đánh giá này?')) {
                                    deleteMutation.mutate(row.reviewId || row.id);
                                }
                            }}
                            className="btn-xs bg-red-100 text-red-600 hover:bg-red-200 rounded px-2 py-1"
                            title="Xóa"
                        >
                            <i className="fa-solid fa-trash" />
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
        queryFn: async () => (await apiClient.get(ENDPOINTS.REVIEWS.PENDING)).data,
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
                    <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {(row.employeeName || row.employee?.fullName || 'N')?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900">{row.employeeName || row.employee?.fullName}</div>
                        <div className="text-xs text-gray-500">{row.employee?.department?.name}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Kỳ đánh giá',
            accessorKey: 'reviewPeriod',
            cell: (row) => <span className="font-medium">{row.reviewPeriod}</span>
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
                const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';
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
                <div className="flex gap-2">
                    <button
                        onClick={() => approveMutation.mutate(row.reviewId || row.id)}
                        disabled={approveMutation.isPending}
                        className="btn-xs bg-green-500 text-white hover:bg-green-600 rounded px-3 py-1 flex items-center gap-1"
                    >
                        <i className="fa-solid fa-check" /> Duyệt
                    </button>
                    <button
                        onClick={() => setRejectingId(row.reviewId || row.id)}
                        className="btn-xs bg-red-100 text-red-600 hover:bg-red-200 rounded px-3 py-1 flex items-center gap-1"
                    >
                        <i className="fa-solid fa-xmark" /> Từ chối
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRejectingId(null)} />
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">Từ chối đánh giá</h3>
                            <button onClick={() => setRejectingId(null)} className="text-gray-400 hover:text-gray-600">
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="label-required">Lý do từ chối</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="input w-full"
                                rows="3"
                                placeholder="Nhập lý do từ chối..."
                            />
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setRejectingId(null)} className="btn-ghost">Hủy</button>
                            <button
                                onClick={handleReject}
                                disabled={rejectMutation.isPending}
                                className="btn-danger"
                            >
                                {rejectMutation.isPending ? <i className="fa-solid fa-spinner fa-spin" /> : 'Xác nhận từ chối'}
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
        DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Bản nháp' },
        PENDING_APPROVAL: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Chờ duyệt' },
        APPROVED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Đã duyệt' },
        REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Từ chối' },
    };
    const s = styles[status] || styles.DRAFT;
    return <span className={`badge ${s.bg} ${s.text} text-xs px-2 py-1 rounded-full`}>{s.label}</span>;
}

function ReviewTypeBadge({ type }) {
    const styles = {
        QUARTERLY: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Quý' },
        SEMI_ANNUAL: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Nửa năm' },
        ANNUAL: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Cuối năm' },
        PROBATION: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Thử việc' },
    };
    const s = styles[type] || { bg: 'bg-gray-50', text: 'text-gray-700', label: type };
    return <span className={`${s.bg} ${s.text} text-xs px-2 py-1 rounded font-medium`}>{s.label}</span>;
}

function RankBadge({ rank }) {
    const styles = {
        A: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
        B: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
        C: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
        D: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    };
    const s = styles[rank] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };

    if (!rank) return <span className="text-gray-400">-</span>;

    return (
        <span className={`${s.bg} ${s.text} border ${s.border} font-bold text-sm w-8 h-8 flex items-center justify-center rounded-full`}>
            {rank}
        </span>
    );
}

function ScoreBadge({ score }) {
    if (score === '-' || score == null) return <span className="text-gray-400">-</span>;

    const numScore = parseFloat(score);
    let color = 'text-gray-600';
    if (numScore >= 8) color = 'text-green-600';
    else if (numScore >= 6) color = 'text-blue-600';
    else if (numScore >= 4) color = 'text-yellow-600';
    else color = 'text-red-600';

    return <span className={`font-bold ${color}`}>{score}</span>;
}

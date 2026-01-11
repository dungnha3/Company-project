import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import DataTable from '@shared/components/ui/DataTable';
import ExportButton from '@shared/components/ui/ExportButton';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

export default function LeaveRequestsPage() {
    const { hasRole } = useWorkspaceStore();
    const [activeTab, setActiveTab] = useState('my-requests');
    const [showCreateModal, setShowCreateModal] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Nghỉ phép</h1>
                    <p className="text-gray-500 text-sm">Quản lý đơn xin nghỉ phép</p>
                </div>
                <div className="flex gap-2">
                    {hasRole('MANAGER_HR', 'OWNER', 'ADMIN') && (
                        <ExportButton
                            endpoint={ENDPOINTS.EXPORT.LEAVES}
                            params={{
                                startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
                                endDate: new Date().toISOString().split('T')[0]
                            }}
                            filename={`NghiPhep_${new Date().getFullYear()}.xlsx`}
                            label="Xuất Excel"
                        />
                    )}
                    <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                        <i className="fa-solid fa-plus mr-2" /> Tạo đơn xin nghỉ
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('my-requests')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'my-requests' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <i className="fa-solid fa-list mr-2" />
                        Đơn của tôi
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'calendar' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <i className="fa-solid fa-calendar-days mr-2" />
                        Lịch nghỉ
                    </button>
                    {hasRole('MANAGER_HR', 'OWNER', 'ADMIN', 'MANAGER_PROJECT') && (
                        <button
                            onClick={() => setActiveTab('pending-approval')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'pending-approval' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            <i className="fa-solid fa-gavel mr-2" />
                            Cần duyệt <span className="ml-1 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">!</span>
                        </button>
                    )}
                </nav>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'my-requests' && <MyLeaveRequests />}
                {activeTab === 'calendar' && <LeaveCalendar />}
                {activeTab === 'pending-approval' && <PendingLeaveRequests />}
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

function MyLeaveRequests() {
    const { data: requests, isLoading } = useQuery({
        queryKey: ['my-leave-requests'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.LEAVE_REQUESTS.MY_REQUESTS)).data,
    });

    const columns = [
        {
            header: 'Loại nghỉ',
            accessorKey: 'type',
            cell: (row) => <span className="font-medium">{row.leaveType || row.type}</span>
        },
        {
            header: 'Từ ngày',
            accessorKey: 'startDate',
            cell: (row) => <span className="text-gray-600">{new Date(row.startDate).toLocaleDateString('vi-VN')}</span>
        },
        {
            header: 'Đến ngày',
            accessorKey: 'endDate',
            cell: (row) => <span className="text-gray-600">{new Date(row.endDate).toLocaleDateString('vi-VN')}</span>
        },
        {
            header: 'Lý do',
            accessorKey: 'reason',
            cell: (row) => <span className="truncate max-w-xs block text-gray-500">{row.reason}</span>
        },
        {
            header: 'Trạng thái',
            accessorKey: 'status',
            cell: (row) => <StatusBadge status={row.status} />
        }
    ];

    return <DataTable columns={columns} data={requests || []} loading={isLoading} />;
}

function PendingLeaveRequests() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // Use LIST endpoint filtered by PENDING or PENDING specific endpoint if available
    // Assuming backend filter or we fetch all and filter client side for now if LIST doesn't support params nicely
    // Or use the provided ENDPOINTS.LEAVE_REQUESTS.LIST and hope for PENDING functionality
    const { data: requests, isLoading } = useQuery({
        queryKey: ['pending-leave-requests'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.LEAVE_REQUESTS.LIST, { params: { status: 'PENDING' } })).data,
    });

    const approveMutation = useMutation({
        mutationFn: (id) => apiClient.post(ENDPOINTS.LEAVE_REQUESTS.APPROVE(id)), // Assume endpoint structure
        onSuccess: () => {
            showToast('Đã duyệt đơn', 'success');
            queryClient.invalidateQueries(['pending-leave-requests']);
        }
    });

    const rejectMutation = useMutation({
        mutationFn: (id) => apiClient.post(ENDPOINTS.LEAVE_REQUESTS.REJECT(id)),
        onSuccess: () => {
            showToast('Đã từ chối đơn', 'success');
            queryClient.invalidateQueries(['pending-leave-requests']);
        }
    });

    const handleAction = (id, action) => {
        if (action === 'approve') approveMutation.mutate(id);
        if (action === 'reject') rejectMutation.mutate(id);
    };

    const columns = [
        {
            header: 'Nhân viên',
            accessorKey: 'employeeName',
            cell: (row) => (
                <div>
                    <div className="font-semibold">{row.employee?.fullName}</div>
                    <div className="text-xs text-gray-500">{row.employee?.employeeId}</div>
                </div>
            )
        },
        {
            header: 'Loại nghỉ',
            accessorKey: 'type',
            cell: (row) => <span className="font-medium">{row.leaveType || row.type}</span>
        },
        {
            header: 'Thời gian',
            accessorKey: 'dateRange',
            cell: (row) => <span className="text-gray-600 text-xs">{new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}</span>
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
                <div className="flex gap-2">
                    <button
                        onClick={() => handleAction(row.leaveRequestId || row.id, 'approve')}
                        className="btn-xs bg-green-100 text-green-700 hover:bg-green-200 rounded px-2 py-1"
                        title="Duyệt"
                    >
                        <i className="fa-solid fa-check" />
                    </button>
                    <button
                        onClick={() => handleAction(row.leaveRequestId || row.id, 'reject')}
                        className="btn-xs bg-red-100 text-red-700 hover:bg-red-200 rounded px-2 py-1"
                        title="Từ chối"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>
            )
        }
    ];

    // Assuming requests might be paginated { content: [] } or array []
    const data = Array.isArray(requests) ? requests : requests?.content || [];

    return <DataTable columns={columns} data={data} loading={isLoading} />;
}

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

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            leaveType: formData.get('leaveType'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            reason: formData.get('reason'),
        };
        mutation.mutate(data);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                        <h2 className="text-lg font-bold text-gray-800">Tạo đơn xin nghỉ</h2>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark" /></button>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="label-required">Loại nghỉ</label>
                            <select name="leaveType" className="input w-full" required>
                                <option value="ANNUAL">Nghỉ phép năm</option>
                                <option value="SICK">Nghỉ ốm</option>
                                <option value="UNPAID">Nghỉ không lương</option>
                                <option value="MATERNITY">Thai sản</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-required">Từ ngày</label>
                                <input type="date" name="startDate" className="input w-full" required />
                            </div>
                            <div>
                                <label className="label-required">Đến ngày</label>
                                <input type="date" name="endDate" className="input w-full" required />
                            </div>
                        </div>
                        <div>
                            <label className="label-required">Lý do</label>
                            <textarea name="reason" className="input w-full" rows="3" required placeholder="Nhập lý do nghỉ..."></textarea>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-xl">
                        <button type="button" onClick={onClose} className="btn-ghost">Hủy</button>
                        <button type="submit" disabled={mutation.isPending} className="btn-primary">
                            {mutation.isPending ? <i className="fa-solid fa-spinner fa-spin" /> : 'Gửi đơn'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const styles = {
        PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Chờ duyệt' },
        APPROVED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Đã duyệt' },
        REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Từ chối' },
        CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Đã hủy' }
    };
    const s = styles[status] || styles.PENDING;
    return <span className={`badge ${s.bg} ${s.text}`}>{s.label}</span>;
}

function LeaveCalendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Fetch all approved leave requests
    const { data: leaveRequests = [] } = useQuery({
        queryKey: ['leave-calendar', currentMonth.getMonth(), currentMonth.getFullYear()],
        queryFn: async () => (await apiClient.get(ENDPOINTS.LEAVE_REQUESTS.LIST, { params: { status: 'APPROVED' } })).data?.content || [],
    });

    // Build leave map by date range
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

    // Calendar grid
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];
    for (let i = 0; i < startPadding; i++) {
        days.push({ day: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        days.push({ day: d, date, leaves: leaveDays[date.toDateString()] || [] });
    }

    const goToPrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const goToNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

    const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    const LEAVE_COLORS = {
        ANNUAL: 'bg-blue-100 text-blue-700 border-blue-200',
        SICK: 'bg-red-100 text-red-700 border-red-200',
        UNPAID: 'bg-gray-100 text-gray-700 border-gray-200',
        MATERNITY: 'bg-pink-100 text-pink-700 border-pink-200',
        OTHER: 'bg-purple-100 text-purple-700 border-purple-200',
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <button onClick={goToPrevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                        <i className="fa-solid fa-chevron-left text-gray-500" />
                    </button>
                    <h3 className="text-lg font-bold text-gray-800 min-w-[180px] text-center">
                        {currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                        <i className="fa-solid fa-chevron-right text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-gray-400 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((item, idx) => {
                    if (!item.day) {
                        return <div key={idx} className="h-24 bg-gray-50 rounded-lg" />;
                    }

                    const isToday = item.date.toDateString() === new Date().toDateString();
                    const isWeekend = item.date.getDay() === 0 || item.date.getDay() === 6;

                    return (
                        <div
                            key={idx}
                            className={`
                                h-24 p-2 rounded-lg border transition-all overflow-hidden
                                ${isWeekend ? 'bg-gray-50' : 'bg-white'}
                                ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : 'border-gray-100'}
                            `}
                        >
                            <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : isWeekend ? 'text-gray-400' : 'text-gray-600'}`}>
                                {item.day}
                            </div>
                            <div className="space-y-0.5">
                                {item.leaves.slice(0, 2).map((leave, i) => (
                                    <div
                                        key={i}
                                        className={`text-xs px-1.5 py-0.5 rounded truncate border ${LEAVE_COLORS[leave.leaveType || leave.type] || LEAVE_COLORS.OTHER}`}
                                        title={`${leave.employee?.fullName || 'User'} - ${leave.leaveType || leave.type}`}
                                    >
                                        {leave.employee?.fullName?.split(' ').pop() || 'User'}
                                    </div>
                                ))}
                                {item.leaves.length > 2 && (
                                    <div className="text-xs text-gray-400 px-1">
                                        +{item.leaves.length - 2} khác
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200" />
                    <span className="text-gray-600">Nghỉ phép</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
                    <span className="text-gray-600">Nghỉ ốm</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200" />
                    <span className="text-gray-600">Không lương</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded bg-pink-100 border border-pink-200" />
                    <span className="text-gray-600">Thai sản</span>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import DataTable from '@shared/components/ui/DataTable';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

export default function AttendancePage() {
    const { hasRole } = useWorkspaceStore();
    const [activeTab, setActiveTab] = useState('my-history');

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Chấm công</h1>

            {/* Check-in/Check-out Widget */}
            <AttendanceWidget />

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('my-history')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'my-history' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Lịch sử của tôi
                    </button>
                    {hasRole('MANAGER_HR', 'OWNER', 'ADMIN') && (
                        <button
                            onClick={() => setActiveTab('manager-report')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'manager-report' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Quản lý chấm công
                        </button>
                    )}
                </nav>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'my-history' && <MyAttendanceHistory />}
                {activeTab === 'manager-report' && <ManagerAttendanceReport />}
            </div>
        </div>
    );
}

function AttendanceWidget() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch Today's Attendance
    const { data: todayRecord, isLoading } = useQuery({
        queryKey: ['attendance-today'],
        queryFn: async () => {
            try {
                return (await apiClient.get(ENDPOINTS.ATTENDANCE.TODAY)).data;
            } catch (e) {
                return null; // No record yet logic
            }
        },
        retry: false
    });

    const checkInMutation = useMutation({
        mutationFn: () => apiClient.post(ENDPOINTS.ATTENDANCE.CHECK_IN),
        onSuccess: () => {
            showToast('Check-in thành công!', 'success');
            queryClient.invalidateQueries(['attendance-today']);
            queryClient.invalidateQueries(['my-attendance-history']);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Check-in thất bại', 'error')
    });

    const checkOutMutation = useMutation({
        mutationFn: () => apiClient.post(ENDPOINTS.ATTENDANCE.CHECK_OUT),
        onSuccess: () => {
            showToast('Check-out thành công!', 'success');
            queryClient.invalidateQueries(['attendance-today']);
            queryClient.invalidateQueries(['my-attendance-history']);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Check-out thất bại', 'error')
    });

    if (isLoading) return <div className="animate-pulse h-32 bg-gray-100 rounded-xl"></div>;

    const hasCheckedIn = !!todayRecord?.checkInTime;
    const hasCheckedOut = !!todayRecord?.checkOutTime;

    return (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
                <div className="text-base opacity-90 mb-1">{currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div className="text-4xl font-bold font-mono tracking-wider mb-2">
                    {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="flex gap-4 text-sm mt-2">
                    <div className="bg-white/20 px-3 py-1 rounded backdrop-blur-sm">
                        Check-in: <span className="font-bold">{todayRecord?.checkInTime ? new Date(todayRecord.checkInTime).toLocaleTimeString('vi-VN') : '--:--'}</span>
                    </div>
                    <div className="bg-white/20 px-3 py-1 rounded backdrop-blur-sm">
                        Check-out: <span className="font-bold">{todayRecord?.checkOutTime ? new Date(todayRecord.checkOutTime).toLocaleTimeString('vi-VN') : '--:--'}</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-4">
                <button
                    onClick={() => checkInMutation.mutate()}
                    disabled={hasCheckedIn || checkInMutation.isPending}
                    className={`
                        px-6 py-3 rounded-lg font-bold shadow-lg transition-all transform hover:-translate-y-1 active:scale-95
                        ${hasCheckedIn
                            ? 'bg-gray-400 cursor-not-allowed opacity-50'
                            : 'bg-white text-blue-600 hover:bg-blue-50'
                        }
                    `}
                >
                    {checkInMutation.isPending ? 'Đang xử lý...' : 'CHECK IN'}
                </button>
                <button
                    onClick={() => checkOutMutation.mutate()}
                    disabled={!hasCheckedIn || hasCheckedOut || checkOutMutation.isPending}
                    className={`
                         px-6 py-3 rounded-lg font-bold shadow-lg transition-all transform hover:-translate-y-1 active:scale-95
                         ${!hasCheckedIn || hasCheckedOut
                            ? 'bg-gray-400 cursor-not-allowed opacity-50'
                            : 'bg-orange-500 text-white hover:bg-orange-400' // Distinct color for Check-out
                        }
                    `}
                >
                    {checkOutMutation.isPending ? 'Đang xử lý...' : 'CHECK OUT'}
                </button>
            </div>
        </div>
    );
}

function MyAttendanceHistory() {
    const { data: history, isLoading } = useQuery({
        queryKey: ['my-attendance-history'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ATTENDANCE.MY_HISTORY)).data,
    });

    const columns = [
        {
            header: 'Ngày',
            accessorKey: 'date',
            cell: (row) => <span className="font-medium">{new Date(row.date).toLocaleDateString('vi-VN')}</span>
        },
        {
            header: 'Giờ vào',
            accessorKey: 'checkInTime',
            cell: (row) => row.checkInTime ? <span className="text-green-600 font-mono">{new Date(row.checkInTime).toLocaleTimeString('vi-VN')}</span> : '-'
        },
        {
            header: 'Giờ ra',
            accessorKey: 'checkOutTime',
            cell: (row) => row.checkOutTime ? <span className="text-orange-600 font-mono">{new Date(row.checkOutTime).toLocaleTimeString('vi-VN')}</span> : '-'
        },
        {
            header: 'Thời gian làm việc',
            accessorKey: 'workHours',
            cell: (row) => row.workHours ? `${row.workHours.toFixed(2)}h` : '-'
        },
        {
            header: 'Trạng thái',
            accessorKey: 'status',
            cell: (row) => (
                <span className={`badge ${row.status === 'PRESENT' ? 'bg-green-100 text-green-700' : row.status === 'LATE' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {row.status}
                </span>
            )
        }
    ];

    return (
        <div className="bg-white rounded-xl shadow border border-gray-100 p-1">
            <DataTable columns={columns} data={history || []} loading={isLoading} />
        </div>
    );
}

function ManagerAttendanceReport() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const { data: report, isLoading } = useQuery({
        queryKey: ['attendance-report', date],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ATTENDANCE.LIST, { params: { date } })).data, // Assuming LIST supports date param or use dedicated REPORT endpoint
    });

    const columns = [
        {
            header: 'Nhân viên',
            accessorKey: 'employeeName',
            cell: (row) => (
                <div>
                    <div className="font-semibold">{row.employee?.fullName || row.employeeName}</div>
                    <div className="text-xs text-gray-500">{row.employee?.employeeId}</div>
                </div>
            )
        },
        {
            header: 'Giờ vào',
            accessorKey: 'checkInTime',
            cell: (row) => row.checkInTime ? <span className="text-green-600 font-mono">{new Date(row.checkInTime).toLocaleTimeString('vi-VN')}</span> : '-'
        },
        {
            header: 'Giờ ra',
            accessorKey: 'checkOutTime',
            cell: (row) => row.checkOutTime ? <span className="text-orange-600 font-mono">{new Date(row.checkOutTime).toLocaleTimeString('vi-VN')}</span> : '-'
        },
        {
            header: 'Trạng thái',
            accessorKey: 'status',
            cell: (row) => <span className="badge badge-gray">{row.status}</span>
        }
    ];

    return (
        <div className="space-y-4 pt-4">
            <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <label className="text-sm font-medium text-gray-700">Chọn ngày xem báo cáo:</label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input max-w-xs"
                />
            </div>

            <DataTable columns={columns} data={report?.content || report || []} loading={isLoading} />
        </div>
    );
}

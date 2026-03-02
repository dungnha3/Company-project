import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import DataTable from '@shared/components/ui/DataTable';
import ExportButton from '@shared/components/ui/ExportButton';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { formatDate, formatTime, formatNumber } from '@shared/utils/formatters';

export default function AttendancePage() {
    const { hasPermission } = useWorkspaceStore();
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
                        <i className="fa-solid fa-list mr-2" />
                        Lịch sử
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'calendar' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <i className="fa-solid fa-calendar-days mr-2" />
                        Lịch
                    </button>
                    {hasPermission('attendanceEdit') && (
                        <button
                            onClick={() => setActiveTab('manager-report')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'manager-report' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            <i className="fa-solid fa-chart-bar mr-2" />
                            Quản lý
                        </button>
                    )}
                </nav>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'my-history' && <MyAttendanceHistory />}
                {activeTab === 'calendar' && <AttendanceCalendar />}
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
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
                <div className="text-base opacity-90 mb-1">{formatDate(currentTime, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div className="text-4xl font-bold font-mono tracking-wider mb-2">
                    {formatTime(currentTime, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="flex gap-4 text-sm mt-2">
                    <div className="bg-white/20 px-3 py-1 rounded backdrop-blur-sm">
                        Check-in: <span className="font-bold">{todayRecord?.checkInTime ? formatTime(todayRecord.checkInTime) : '--:--'}</span>
                    </div>
                    <div className="bg-white/20 px-3 py-1 rounded backdrop-blur-sm">
                        Check-out: <span className="font-bold">{todayRecord?.checkOutTime ? formatTime(todayRecord.checkOutTime) : '--:--'}</span>
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
                            : 'bg-white text-indigo-600 hover:bg-indigo-50'
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
            cell: (row) => <span className="font-medium">{formatDate(row.date)}</span>
        },
        {
            header: 'Giờ vào',
            accessorKey: 'checkInTime',
            cell: (row) => row.checkInTime ? <span className="text-green-600 font-mono">{formatTime(row.checkInTime)}</span> : '-'
        },
        {
            header: 'Giờ ra',
            accessorKey: 'checkOutTime',
            cell: (row) => row.checkOutTime ? <span className="text-orange-600 font-mono">{formatTime(row.checkOutTime)}</span> : '-'
        },
        {
            header: 'Thời gian làm việc',
            accessorKey: 'workHours',
            cell: (row) => row.workHours ? `${formatNumber(row.workHours, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}h` : '-'
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
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-100 p-1">
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
            cell: (row) => row.checkInTime ? <span className="text-green-600 font-mono">{formatTime(row.checkInTime)}</span> : '-'
        },
        {
            header: 'Giờ ra',
            accessorKey: 'checkOutTime',
            cell: (row) => row.checkOutTime ? <span className="text-orange-600 font-mono">{formatTime(row.checkOutTime)}</span> : '-'
        },
        {
            header: 'Trạng thái',
            accessorKey: 'status',
            cell: (row) => <span className="badge badge-gray">{row.status}</span>
        }
    ];

    return (
        <div className="space-y-4 pt-4">
            <div className="flex gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex gap-4 items-center">
                    <label className="text-sm font-medium text-gray-700">Chọn ngày xem báo cáo:</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="input max-w-xs"
                    />
                </div>
                <ExportButton
                    endpoint={ENDPOINTS.EXPORT.ATTENDANCE}
                    params={{ month: new Date(date).getMonth() + 1, year: new Date(date).getFullYear() }}
                    filename={`chamcong_${date}.xlsx`}
                    label="Xuất Excel"
                />
            </div>

            <DataTable columns={columns} data={report?.content || report || []} loading={isLoading} />
        </div>
    );
}

function AttendanceCalendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const { data: monthData = [] } = useQuery({
        queryKey: ['my-attendance-month', currentMonth.getMonth(), currentMonth.getFullYear()],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ATTENDANCE.MY_HISTORY)).data || [],
    });

    // Build attendance map by date
    const attendanceMap = {};
    monthData.forEach(record => {
        const dateKey = new Date(record.date).toDateString();
        attendanceMap[dateKey] = record;
    });

    // Get calendar grid data
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();

    const days = [];
    // Add padding for days before month starts
    for (let i = 0; i < startPadding; i++) {
        days.push({ day: null, record: null });
    }
    // Add actual days
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const record = attendanceMap[date.toDateString()];
        days.push({ day: d, date, record });
    }

    const goToPrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const goToNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
    const goToToday = () => setCurrentMonth(new Date());

    const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <button onClick={goToPrevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                        <i className="fa-solid fa-chevron-left text-gray-500" />
                    </button>
                    <h3 className="text-lg font-bold text-gray-800 min-w-[180px] text-center">
                        {formatDate(currentMonth, { month: 'long', year: 'numeric' })}
                    </h3>
                    <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                        <i className="fa-solid fa-chevron-right text-gray-500" />
                    </button>
                </div>
                <button onClick={goToToday} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium">
                    Hôm nay
                </button>
            </div>

            {/* Weekday Headers */}
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
                        return <div key={idx} className="h-20 bg-gray-50 rounded-lg" />;
                    }

                    const isToday = item.date.toDateString() === new Date().toDateString();
                    const isWeekend = item.date.getDay() === 0 || item.date.getDay() === 6;
                    const record = item.record;

                    let statusColor = 'bg-gray-50';
                    let statusIcon = null;

                    if (record) {
                        if (record.status === 'PRESENT') {
                            statusColor = 'bg-green-50 border-green-200';
                            statusIcon = <i className="fa-solid fa-check text-green-500" />;
                        } else if (record.status === 'LATE') {
                            statusColor = 'bg-yellow-50 border-yellow-200';
                            statusIcon = <i className="fa-solid fa-clock text-yellow-500" />;
                        } else if (record.status === 'ABSENT') {
                            statusColor = 'bg-red-50 border-red-200';
                            statusIcon = <i className="fa-solid fa-xmark text-red-500" />;
                        }
                    } else if (isWeekend) {
                        statusColor = 'bg-gray-100';
                    }

                    return (
                        <div
                            key={idx}
                            className={`
                                h-20 p-2 rounded-lg border transition-all
                                ${statusColor}
                                ${isToday ? 'ring-2 ring-indigo-400 ring-offset-1' : 'border-gray-100'}
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`text-sm font-medium ${isToday ? 'text-indigo-600' : isWeekend ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {item.day}
                                </span>
                                {statusIcon}
                            </div>
                            {record && (
                                <div className="mt-1 text-xs text-gray-500">
                                    {record.checkInTime && (
                                        <div className="truncate">
                                            <i className="fa-solid fa-arrow-right-to-bracket text-green-500 mr-1" />
                                            {formatTime(record.checkInTime)}
                                        </div>
                                    )}
                                    {record.checkOutTime && (
                                        <div className="truncate">
                                            <i className="fa-solid fa-arrow-right-from-bracket text-orange-500 mr-1" />
                                            {formatTime(record.checkOutTime)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex gap-6 mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-4 h-4 rounded bg-green-100 border border-green-200" />
                    Đúng giờ
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200" />
                    Đi trễ
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
                    Vắng mặt
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-4 h-4 rounded bg-gray-100" />
                    Cuối tuần
                </div>
            </div>
        </div>
    );
}

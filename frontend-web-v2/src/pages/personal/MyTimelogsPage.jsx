import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { timelogApi } from '@shared/api/featureApi';
import MetricCard from '@shared/components/MetricCard';
import GlobalTimerBar from '@shared/components/GlobalTimerBar';
import QuickLogForm from '@shared/components/QuickLogForm';
import { formatNumber } from '@shared/utils/formatters';

export default function MyTimelogsPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);
    const [editingId, setEditingId] = useState(null);
    const [editHours, setEditHours] = useState('');
    const [editDesc, setEditDesc] = useState('');

    const PAGE_SIZE = 20;

    // Fetch timelogs
    const { data, isLoading, isFetching, isError: timelogsError, refetch: refetchTimelogs } = useQuery({
        queryKey: ['timelogs', 'my', page, refreshKey],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.TIMELOGS.MY_LOGS, {
                params: { page, size: PAGE_SIZE }
            });
            return res.data;
        },
        staleTime: 30 * 1000,
        retry: 1,
    });

    // Fetch summary
    const { data: summary, refetch: refetchSummary } = useQuery({
        queryKey: ['timelogs', 'summary', 'my', refreshKey],
        queryFn: async () => {
            const res = await apiClient.get('/api/timelogs/summary/my');
            return res.data;
        },
        staleTime: 30 * 1000,
        retry: 1,
    });

    const handleRetry = () => {
        refetchTimelogs();
        refetchSummary();
    };

    const timelogs = useMemo(() => {
        const list = data?.content || data || [];
        if (page === 0) return list;
        return list;
    }, [data, page]);

    const hasMore = data?.last === false;
    const totalHours = summary?.totalHoursThisWeek || 0;
    const weeklyTarget = 40;

    // Group by date
    const groupedLogs = useMemo(() => {
        const groups = {};
        timelogs.forEach(log => {
            const date = log.workDate;
            if (!groups[date]) groups[date] = [];
            groups[date].push(log);
        });
        return groups;
    }, [timelogs]);

    // Summary by project
    const byProject = useMemo(() => {
        if (!summary?.hoursByProject) return [];
        return summary.hoursByProject;
    }, [summary]);

    // Refresh handler
    const handleRefresh = useCallback(() => {
        setPage(0);
        setRefreshKey(k => k + 1);
    }, []);

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async ({ logId, data: updateData }) => {
            return await timelogApi.updateTimelog(logId, updateData);
        },
        onSuccess: () => handleRefresh(),
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (logId) => {
            return await timelogApi.deleteTimelog(logId);
        },
        onSuccess: () => handleRefresh(),
    });

    const startEdit = (log) => {
        setEditingId(log.logId);
        setEditHours(String(log.loggedHours));
        setEditDesc(log.description || '');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditHours('');
        setEditDesc('');
    };

    const saveEdit = async (logId) => {
        await updateMutation.mutateAsync({
            logId,
            data: {
                loggedHours: parseFloat(editHours),
                description: editDesc.trim() || undefined,
            },
        });
        cancelEdit();
    };

    const handleDelete = async (logId) => {
        if (!confirm('Xóa log này?')) return;
        await deleteMutation.mutateAsync(logId);
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header Banner - Clean white card */}
            <div className="flex items-center justify-between px-6 py-5 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-clock text-gray-500 text-xl" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Nhật ký giờ làm</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Theo dõi thời gian làm việc của bạn</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Tuần này</p>
                        <p className="text-2xl font-semibold text-gray-900">{formatNumber(totalHours, { minimumFractionDigits: 1 })}h</p>
                    </div>
                    <div className="w-40">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                                className="bg-gray-400 rounded-full h-2 transition-all"
                                style={{ width: `${Math.min((totalHours / weeklyTarget) * 100, 100)}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 text-right">{Math.round((totalHours / weeklyTarget) * 100)}% mục tiêu ({weeklyTarget}h)</p>
                    </div>
                </div>
            </div>

            {/* Timer + Quick Log */}
            <GlobalTimerBar onLogComplete={handleRefresh} />
            <QuickLogForm onSuccess={handleRefresh} />

            {/* Summary by project */}
            {byProject.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="font-medium text-gray-900 text-base mb-3">Tổng hợp theo dự án</h3>
                    <div className="space-y-2">
                        {byProject.map(proj => {
                            const maxHours = Math.max(...byProject.map(p => p.totalHours), 1);
                            const pct = (proj.totalHours / maxHours) * 100;
                            return (
                                <div key={proj.projectId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="w-32 text-sm font-medium text-gray-700 truncate">{proj.projectName}</div>
                                    <div className="flex-1">
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div
                                                className="bg-gray-400 rounded-full h-2 transition-all"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="w-16 text-right text-sm font-medium text-gray-900">
                                        {proj.totalHours.toFixed(1)}h
                                    </div>
                                    <div className="w-12 text-right text-xs text-gray-500">
                                        {proj.issueCount} issues
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Timelog List - Clean white card */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Lịch sử</h3>
                    <button
                        onClick={handleRefresh}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                        disabled={isFetching}
                    >
                        <i className={`fa-solid fa-rotate text-xs ${isFetching ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>
                </div>

                {isLoading && page === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        <div className="loading-spinner mx-auto mb-3" />
                        <p>Đang tải...</p>
                    </div>
                ) : timelogsError ? (
                    <div className="p-10 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
                        </div>
                        <h3 className="text-gray-900 font-medium mb-1">Không thể tải dữ liệu</h3>
                        <p className="text-gray-500 text-sm mb-4">Đã xảy ra lỗi khi tải dữ liệu.</p>
                        <button
                            onClick={handleRetry}
                            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors text-sm"
                        >
                            Thử lại
                        </button>
                    </div>
                ) : Object.keys(groupedLogs).length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        <i className="fa-solid fa-clock-rotate-left text-3xl mb-3" />
                        <p className="font-medium text-gray-600">Chưa có nhật ký nào</p>
                        <p className="text-sm mt-1">Bắt đầu timer hoặc log nhanh để theo dõi công việc</p>
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-gray-100">
                        {Object.entries(groupedLogs)
                            .sort(([a], [b]) => new Date(b) - new Date(a))
                            .map(([date, logs]) => {
                                const dateObj = new Date(date + 'T00:00:00');
                                const isToday = dateObj.toDateString() === new Date().toDateString();
                                const dayTotal = logs.reduce((sum, l) => sum + (l.loggedHours || 0), 0);

                                return (
                                    <div key={date} className="p-5">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium ${isToday ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                {dateObj.getDate()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                    {isToday && <span className="ml-2 text-indigo-600 font-medium">Hôm nay</span>}
                                                </p>
                                                <p className="text-xs text-gray-400">{logs.length} entries</p>
                                            </div>
                                            <span className="ml-auto text-gray-900 font-medium text-sm">
                                                {formatNumber(dayTotal, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            {logs.map(log => (
                                                <TimeLogItem
                                                    key={log.logId}
                                                    log={log}
                                                    isEditing={editingId === log.logId}
                                                    editHours={editHours}
                                                    editDesc={editDesc}
                                                    onStartEdit={() => startEdit(log)}
                                                    onCancelEdit={cancelEdit}
                                                    onSaveEdit={() => saveEdit(log.logId)}
                                                    onSetHours={setEditHours}
                                                    onSetDesc={setEditDesc}
                                                    onDelete={() => handleDelete(log.logId)}
                                                    isUpdating={updateMutation.isPending}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                        {hasMore && (
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={isFetching}
                                className="w-full py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {isFetching ? (
                                    <><i className="fa-solid fa-spinner fa-spin text-xs" /> Đang tải...</>
                                ) : (
                                    <><i className="fa-solid fa-arrow-down text-xs" /> Xem thêm</>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function TimeLogItem({
    log,
    isEditing,
    editHours,
    editDesc,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onSetHours,
    onSetDesc,
    onDelete,
    isUpdating,
}) {
    if (isEditing) {
        return (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        value={editHours}
                        onChange={e => onSetHours(e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-center font-medium focus:outline-none focus:border-gray-300"
                    />
                    <span className="text-gray-500 text-sm">giờ</span>
                </div>
                <textarea
                    value={editDesc}
                    onChange={e => onSetDesc(e.target.value)}
                    rows={2}
                    placeholder="Mô tả..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 resize-none"
                />
                <div className="flex gap-2">
                    <button
                        onClick={onSaveEdit}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                    >
                        Lưu
                    </button>
                    <button
                        onClick={onCancelEdit}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                        Hủy
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-100 p-3 group hover:border-gray-200 transition-colors">
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {log.issueKey && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                {log.issueKey}
                            </span>
                        )}
                        {log.issueTitle && (
                            <span className="text-sm font-medium text-gray-700 truncate">{log.issueTitle}</span>
                        )}
                    </div>
                    {log.projectName && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                            <i className="fa-solid fa-folder text-[10px]" />
                            {log.projectName}
                        </p>
                    )}
                    {log.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{log.description}</p>
                    )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-lg font-medium text-gray-900">
                        {formatNumber(log.loggedHours, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={onStartEdit}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Sửa"
                        >
                            <i className="fa-solid fa-pen text-xs" />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Xóa"
                        >
                            <i className="fa-solid fa-trash text-xs" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

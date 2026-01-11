import { useState, useEffect } from 'react';
import { timelogApi } from '../../shared/api/featureApi';

export default function MyTimelogsPage() {
    const [timelogs, setTimelogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        loadTimelogs();
    }, [page]);

    const loadTimelogs = async () => {
        try {
            setLoading(true);
            const data = await timelogApi.getMyTimelogs(page, 20);
            if (page === 0) {
                setTimelogs(data.content || data);
            } else {
                setTimelogs(prev => [...prev, ...(data.content || data)]);
            }
            setHasMore(data.content ? !data.last : data.length === 20);
        } catch (error) {
            console.error('Failed to load timelogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (logId) => {
        if (!confirm('Bạn có chắc muốn xóa time log này?')) return;
        try {
            await timelogApi.deleteTimelog(logId);
            setTimelogs(prev => prev.filter(l => l.logId !== logId));
        } catch (error) {
            console.error('Failed to delete timelog:', error);
        }
    };

    // Group timelogs by date
    const groupedLogs = timelogs.reduce((groups, log) => {
        const date = log.workDate;
        if (!groups[date]) groups[date] = [];
        groups[date].push(log);
        return groups;
    }, {});

    const totalHours = timelogs.reduce((sum, log) => sum + (log.loggedHours || 0), 0);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">⏱️ My Time Logs</h1>
                <div className="bg-indigo-600 px-4 py-2 rounded-lg">
                    <span className="text-white font-semibold">{totalHours.toFixed(1)}h</span>
                    <span className="text-indigo-200 text-sm ml-1">total</span>
                </div>
            </div>

            {loading && page === 0 ? (
                <div className="text-center text-slate-400 py-16">Đang tải...</div>
            ) : Object.keys(groupedLogs).length === 0 ? (
                <div className="text-center py-20 bg-slate-800 rounded-2xl border border-slate-700">
                    <p className="text-slate-400 text-lg mb-2">Bạn chưa có time log nào</p>
                    <p className="text-slate-500 text-sm">Log time từ các issue để theo dõi công việc</p>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {Object.entries(groupedLogs)
                        .sort(([a], [b]) => new Date(b) - new Date(a))
                        .map(([date, logs]) => {
                            const dayTotal = logs.reduce((sum, l) => sum + (l.loggedHours || 0), 0);
                            return (
                                <div key={date}>
                                    <div className="flex justify-between items-center mb-3">
                                        <h2 className="text-lg font-semibold text-white">
                                            📅 {new Date(date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                        </h2>
                                        <span className="text-green-400 font-medium">{dayTotal.toFixed(1)}h</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {logs.map(log => (
                                            <div key={log.logId} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex justify-between items-start group">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="text-indigo-400 font-bold text-lg">{log.loggedHours}h</span>
                                                        <span className="text-slate-300">{log.issueKey || log.issueTitle}</span>
                                                    </div>
                                                    {log.description && (
                                                        <p className="text-slate-400 text-sm">{log.description}</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(log.logId)}
                                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity ml-4"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                    {hasMore && (
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={loading}
                            className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Đang tải...' : 'Xem thêm'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

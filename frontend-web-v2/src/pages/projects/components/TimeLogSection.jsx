import { useState, useEffect } from 'react';
import { timelogApi } from '@shared/api/featureApi';
import { formatNumber } from '@shared/utils/formatters';

/**
 * Time logging section for Issue detail page
 * Shows logged time and allows adding new time entries
 */
export default function TimeLogSection({ issueId, estimatedHours }) {
    const [timelogs, setTimelogs] = useState([]);
    const [totalHours, setTotalHours] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        loggedHours: '',
        workDate: new Date().toISOString().split('T')[0],
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadTimelogs();
    }, [issueId]);

    const loadTimelogs = async () => {
        try {
            setLoading(true);
            const [logs, total] = await Promise.all([
                timelogApi.getIssueTimelogs(issueId),
                timelogApi.getIssueTotalHours(issueId)
            ]);
            setTimelogs(logs);
            setTotalHours(total || 0);
        } catch (error) {
            console.error('Failed to load timelogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.loggedHours || !formData.workDate) return;

        try {
            setSubmitting(true);
            await timelogApi.logTime({
                issueId,
                loggedHours: parseFloat(formData.loggedHours),
                workDate: formData.workDate,
                description: formData.description
            });

            setFormData({
                loggedHours: '',
                workDate: new Date().toISOString().split('T')[0],
                description: ''
            });
            setShowForm(false);
            loadTimelogs();
        } catch (error) {
            console.error('Failed to log time:', error);
            setFormData(prev => ({ ...prev, error: 'Không thể log time. Vui lòng thử lại.' }));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (logId) => {
        if (!confirm('Bạn có chắc muốn xóa time log này?')) return;

        try {
            await timelogApi.deleteTimelog(logId);
            loadTimelogs();
        } catch (error) {
            console.error('Failed to delete timelog:', error);
        }
    };

    const progress = estimatedHours > 0
        ? Math.min((totalHours / estimatedHours) * 100, 100)
        : 0;

    if (loading) {
        return (
            <div className="bg-slate-800 rounded-xl p-4 mt-4 text-center text-slate-400">
                Đang tải...
            </div>
        );
    }

    return (
        <div className="bg-slate-800 rounded-xl p-4 mt-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-medium">⏱️ Time Tracking</h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                    {showForm ? 'Hủy' : '+ Log Time'}
                </button>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
                <div className="flex gap-2 mb-1.5 text-sm">
                    <span className="text-green-400 font-semibold">{formatNumber(totalHours, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h logged</span>
                    {estimatedHours > 0 && (
                        <span className="text-slate-400">/ {estimatedHours}h estimated</span>
                    )}
                </div>
                {estimatedHours > 0 && (
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${progress > 100
                                ? 'bg-gradient-to-r from-amber-500 to-red-500'
                                : 'bg-gradient-to-r from-green-500 to-indigo-500'
                                }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Log form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-slate-700 p-3 rounded-lg mb-4">
                    <div className="flex gap-2 mb-2">
                        <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            max="24"
                            placeholder="Số giờ"
                            value={formData.loggedHours}
                            onChange={(e) => setFormData({ ...formData, loggedHours: e.target.value })}
                            required
                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        />
                        <input
                            type="date"
                            value={formData.workDate}
                            onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                            required
                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    <textarea
                        placeholder="Mô tả công việc (tùy chọn)"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 resize-y min-h-[60px] mb-2"
                    />
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                        {submitting ? 'Đang lưu...' : 'Lưu'}
                    </button>
                </form>
            )}

            {/* Log history */}
            {timelogs.length > 0 ? (
                <div className="flex flex-col gap-2">
                    {timelogs.map(log => (
                        <div key={log.logId} className="relative p-3 bg-slate-700 rounded-lg group">
                            <div className="flex gap-3 text-sm">
                                <span className="text-indigo-400 font-semibold">{log.loggedHours}h</span>
                                <span className="text-slate-400">{log.workDate}</span>
                                <span className="text-slate-300">{log.userName}</span>
                            </div>
                            {log.description && (
                                <p className="mt-1.5 text-xs text-slate-400">{log.description}</p>
                            )}
                            <button
                                onClick={() => handleDelete(log.logId)}
                                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                                title="Xóa"
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-slate-400 text-sm py-4">Chưa có time log nào</p>
            )}
        </div>
    );
}

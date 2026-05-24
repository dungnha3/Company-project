import { useState } from 'react';
import { timelogApi } from '@shared/api/featureApi';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Quick log form — embedded in MyPerformancePage.
 * Shows inline when collapsed, expands as full form on click.
 */
export default function QuickLogForm({ onSuccess }) {
    const queryClient = useQueryClient();
    const [issueId, setIssueId] = useState('');
    const [hours, setHours] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [issues, setIssues] = useState([]);
    const [issuesLoading, setIssuesLoading] = useState(false);
    const [showIssueSearch, setShowIssueSearch] = useState(false);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const loadMyIssues = async () => {
        setIssuesLoading(true);
        try {
            const data = await timelogApi.getMyIssues();
            setIssues(Array.isArray(data) ? data : (data.content || []));
        } finally {
            setIssuesLoading(false);
        }
    };

    const handleOpen = () => {
        setShowIssueSearch(true);
        loadMyIssues();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!issueId) { setError('Chọn issue'); return; }
        if (!hours || parseFloat(hours) <= 0) { setError('Nhập số giờ'); return; }

        setSaving(true);
        try {
            await timelogApi.logTime({
                issueId: parseInt(issueId),
                loggedHours: parseFloat(hours),
                workDate: date,
                description: description.trim() || undefined,
            });
            setIssueId('');
            setHours('');
            setDescription('');
            setShowIssueSearch(false);

            // Auto-invalidate performance and timelog caches
            queryClient.invalidateQueries({ queryKey: ['performance'] });
            queryClient.invalidateQueries({ queryKey: ['timelogs'] });
            queryClient.invalidateQueries({ queryKey: ['project-dashboard'] });

            onSuccess?.();
        } catch (err) {
            setError('Lỗi khi lưu: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const selectedIssue = issues.find(i => String(i.id || i.issueId) === String(issueId));
    const filteredIssues = issues.filter(i =>
        !search ||
        (i.issueKey || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.title || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <i className="fa-solid fa-bolt text-amber-500" />
                    Log nhanh
                </h2>
                <button
                    onClick={handleOpen}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                    <i className="fa-solid fa-plus" />
                    Chọn issue
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issue</label>
                    <button
                        type="button"
                        onClick={handleOpen}
                        className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:border-indigo-300 transition-colors text-left bg-white"
                    >
                        {selectedIssue ? (
                            <>
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold shrink-0">
                                    {selectedIssue.issueKey}
                                </span>
                                <span className="text-gray-700 truncate">{selectedIssue.title}</span>
                            </>
                        ) : (
                            <span className="text-gray-400">Chọn issue...</span>
                        )}
                        <i className="fa-solid fa-chevron-down text-gray-400 ml-auto" />
                    </button>
                    {showIssueSearch && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-50 max-h-64 overflow-y-auto">
                            <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
                                <input
                                    autoFocus
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Tìm issue..."
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            {issuesLoading ? (
                                <div className="p-4 text-center text-gray-400 text-sm">Đang tải...</div>
                            ) : filteredIssues.length === 0 ? (
                                <div className="p-4 text-center text-gray-400 text-sm">Không tìm thấy issue</div>
                            ) : (
                                filteredIssues.map(issue => (
                                    <button
                                        key={issue.id || issue.issueId}
                                        type="button"
                                        onClick={() => {
                                            setIssueId(issue.id || issue.issueId);
                                            setShowIssueSearch(false);
                                            setSearch('');
                                        }}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-bold shrink-0">
                                            {issue.issueKey}
                                        </span>
                                        <span className="text-sm text-gray-700 truncate">{issue.title}</span>
                                        {issue.projectName && (
                                            <span className="text-xs text-gray-400 ml-auto truncate hidden sm:block">{issue.projectName}</span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số giờ</label>
                        <input
                            type="number" step="0.25" min="0.25" max="24"
                            value={hours}
                            onChange={e => setHours(e.target.value)}
                            placeholder="0.5"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono text-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (tùy chọn)</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Mô tả công việc đã làm..."
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={saving || !issueId || !hours}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang lưu...</>
                    ) : (
                        <><i className="fa-solid fa-check" /> Lưu log</>
                    )}
                </button>
            </form>
        </div>
    );
}

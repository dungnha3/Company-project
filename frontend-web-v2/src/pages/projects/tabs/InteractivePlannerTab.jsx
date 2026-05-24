import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { formatDate } from '@shared/utils/formatters';
import { useAccessControl } from '@shared/hooks/useAccessControl';
import IssueDetailModal from '../components/IssueDetailModal';

const QUADRANTS = [
    { id: 1, title: 'Làm ngay', subtitle: 'Quan trọng & Khẩn cấp', icon: 'fa-fire', color: 'from-red-500 to-rose-600', bg: 'bg-red-50/60', border: 'border-red-200 hover:border-red-300', text: 'text-red-700' },
    { id: 2, title: 'Lên kế hoạch', subtitle: 'Quan trọng & Không khẩn', icon: 'fa-calendar-check', color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50/60', border: 'border-blue-200 hover:border-blue-300', text: 'text-blue-700' },
    { id: 3, title: 'Giao lại', subtitle: 'Không quan trọng & Khẩn', icon: 'fa-share', color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50/60', border: 'border-amber-200 hover:border-amber-300', text: 'text-amber-700' },
    { id: 4, title: 'Làm sau', subtitle: 'Không quan trọng & Không khẩn', icon: 'fa-clock', color: 'from-gray-400 to-gray-500', bg: 'bg-gray-50/60', border: 'border-gray-200 hover:border-gray-300', text: 'text-gray-600' },
];

const PRIORITY_COLORS = { CRITICAL: 'bg-red-500', HIGH: 'bg-orange-500', MEDIUM: 'bg-indigo-500', LOW: 'bg-gray-400' };

const MONTHS = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

export default function InteractivePlannerTab({ projectId }) {
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [backlogFilter, setBacklogFilter] = useState('unscheduled'); // unscheduled | all
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [draggedIssueId, setDraggedIssueId] = useState(null);

    const queryClient = useQueryClient();
    const toast = useToast();
    const { hasPermission } = useAccessControl();
    const canManageGoals = hasPermission('PROJECT.MANAGE_PHASES');

    // Fetch issues
    const { data: issuesRaw = [], isLoading: isIssuesLoading } = useQuery({
        queryKey: ['project-issues-planner', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ISSUES.BY_PROJECT(projectId), {
                params: { size: 500, sort: 'createdAt,desc' }
            });
            return res.data?.content || res.data || [];
        },
        enabled: !!projectId,
    });
    const issues = Array.isArray(issuesRaw) ? issuesRaw : [];

    // Fetch goals for year
    const { data: goals = [] } = useQuery({
        queryKey: ['project-goals', projectId, filterYear],
        queryFn: async () => {
            const res = await apiClient.get(`/api/projects/${projectId}/goals`, {
                params: { year: filterYear },
            });
            return res.data || [];
        },
        enabled: !!projectId,
    });

    // Fetch all goals to determine available years
    const { data: allGoals = [] } = useQuery({
        queryKey: ['project-goals-all', projectId],
        queryFn: async () => {
            const res = await apiClient.get(`/api/projects/${projectId}/goals`);
            return res.data || [];
        },
        enabled: !!projectId,
    });
    const availableYears = [...new Set(allGoals.map(g => g.year))].sort((a, b) => b - a);

    // Goal Mutation: delete & recreate because there is no edit PUT in BE
    const deleteGoalMutation = useMutation({
        mutationFn: (goalId) => apiClient.delete(`/api/projects/${projectId}/goals/${goalId}`),
        onSuccess: () => {
            toast.success('Đã xóa mục tiêu');
            queryClient.invalidateQueries(['project-goals', projectId]);
            queryClient.invalidateQueries(['project-goals-all', projectId]);
        },
    });

    const toggleGoalMutation = useMutation({
        mutationFn: (goalId) => apiClient.patch(`/api/projects/${projectId}/goals/${goalId}/toggle`),
        onSuccess: () => {
            toast.success('Đã cập nhật trạng thái');
            queryClient.invalidateQueries(['project-goals', projectId]);
        },
    });

    // Update Issue Mutation (for drag & drop)
    const updateIssueMutation = useMutation({
        mutationFn: async ({ issueId, payload }) => {
            const originalIssue = issues.find(i => i.issueId === issueId);
            if (!originalIssue) return;
            return apiClient.put(`/api/issues/${issueId}`, {
                title: originalIssue.title || originalIssue.subject,
                description: originalIssue.description,
                statusId: originalIssue.statusId,
                priority: originalIssue.priority,
                issueType: originalIssue.issueType,
                assigneeId: originalIssue.assigneeId,
                estimatedHours: originalIssue.estimatedHours,
                actualHours: originalIssue.actualHours,
                startDate: originalIssue.startDate,
                dueDate: originalIssue.dueDate,
                weight: originalIssue.weight,
                isImportant: originalIssue.isImportant || false,
                isUrgent: originalIssue.isUrgent || false,
                ...payload
            });
        },
        onSuccess: () => {
            toast.success('Đã cập nhật công việc');
            queryClient.invalidateQueries(['project-issues-planner', projectId]);
            queryClient.invalidateQueries(['project-issues-calendar', projectId]);
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        }
    });

    // Group issues by eisenhower quadrant
    const quadrantData = useMemo(() => {
        const map = { 1: [], 2: [], 3: [], 4: [] };
        issues.forEach(i => {
            if (i.statusName === 'Done') return; // Exclude completed items from active planner
            const imp = Boolean(i.isImportant);
            const urg = Boolean(i.isUrgent);
            let q;
            if (imp && urg)      q = 1;
            else if (imp && !urg) q = 2;
            else if (!imp && urg) q = 3;
            else                  q = 4;
            map[q].push(i);
        });
        return map;
    }, [issues]);

    // Group issues by due month
    const issuesByMonth = useMemo(() => {
        const map = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: [], 12: [] };
        issues.forEach(i => {
            if (!i.dueDate || i.statusName === 'Done') return;
            const date = new Date(i.dueDate);
            if (date.getFullYear() === filterYear) {
                const month = date.getMonth() + 1;
                if (map[month]) map[month].push(i);
            }
        });
        return map;
    }, [issues, filterYear]);

    // Group goals by month
    const goalsByMonth = useMemo(() => {
        return goals.reduce((acc, goal) => {
            const m = goal.month;
            if (!acc[m]) acc[m] = [];
            acc[m].push(goal);
            return acc;
        }, {});
    }, [goals]);

    // Compute progress by month
    const progressByMonth = useMemo(() => {
        return Object.entries(goalsByMonth).reduce((acc, [m, monthGoals]) => {
            const completed = monthGoals.filter(g => g.isCompleted).length;
            const total = monthGoals.length;
            acc[m] = { completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
            return acc;
        }, {});
    }, [goalsByMonth]);

    // Backlog List: issues that are active and match query
    const backlogIssues = useMemo(() => {
        return issues.filter(i => {
            if (i.statusName === 'Done') return false;
            
            // Search query filter
            const matchesSearch = i.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  i.issueKey?.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;

            // Unscheduled filter
            if (backlogFilter === 'unscheduled') {
                const isScheduled = i.dueDate || i.isImportant || i.isUrgent;
                return !isScheduled;
            }
            return true;
        });
    }, [issues, searchQuery, backlogFilter]);

    // Drag & Drop Handlers
    const handleDragStart = (e, issueId) => {
        e.dataTransfer.setData('text/plain', issueId.toString());
        setDraggedIssueId(issueId);
    };

    const handleDragEnd = () => {
        setDraggedIssueId(null);
    };

    const handleDropQuadrant = (e, quadrantId) => {
        e.preventDefault();
        const idStr = e.dataTransfer.getData('text/plain');
        const issueId = Number(idStr);
        if (!issueId) return;

        let isImportant = false;
        let isUrgent = false;
        if (quadrantId === 1) { isImportant = true; isUrgent = true; }
        else if (quadrantId === 2) { isImportant = true; isUrgent = false; }
        else if (quadrantId === 3) { isImportant = false; isUrgent = true; }

        updateIssueMutation.mutate({
            issueId,
            payload: { isImportant, isUrgent }
        });
    };

    const handleDropMonth = (e, month) => {
        e.preventDefault();
        const idStr = e.dataTransfer.getData('text/plain');
        const issueId = Number(idStr);
        if (!issueId) return;

        // Set due date to the last day of that month
        const lastDay = new Date(filterYear, month, 0).getDate();
        const dueDate = `${filterYear}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        updateIssueMutation.mutate({
            issueId,
            payload: { dueDate }
        });
    };

    const handleOpenEditGoal = (goal, e) => {
        e.stopPropagation();
        setEditingGoal(goal);
        setShowGoalModal(true);
    };

    const handleOpenCreateGoal = () => {
        setEditingGoal(null);
        setShowGoalModal(true);
    };

    if (isIssuesLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex gap-6 h-[calc(100vh-140px)] -mt-2 animate-fade-in relative">
            
            {/* LEFT SIDEBAR: Task Backlog (Hộp cát công việc) */}
            <div className="w-80 md:w-96 shrink-0 bg-white border border-gray-150 rounded-2xl p-4 flex flex-col shadow-sm">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <i className="fa-solid fa-box-archive text-indigo-500" />
                        Hộp cát công việc
                    </h3>
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                        {backlogIssues.length} việc
                    </span>
                </div>

                {/* Filters */}
                <div className="space-y-2 mb-3 flex-shrink-0">
                    <div className="relative">
                        <i className="fa-solid fa-search absolute left-3 top-2.5 text-xs text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm key hoặc tên công việc..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-400 transition-colors"
                        />
                    </div>
                    <div className="flex bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                        <button
                            onClick={() => setBacklogFilter('unscheduled')}
                            className={`flex-1 py-1 rounded-md transition-all ${backlogFilter === 'unscheduled' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            Chưa lập lịch / Chưa phân loại
                        </button>
                        <button
                            onClick={() => setBacklogFilter('all')}
                            className={`flex-1 py-1 rounded-md transition-all ${backlogFilter === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            Tất cả việc chưa xong
                        </button>
                    </div>
                </div>

                {/* List Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {backlogIssues.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 text-xs italic">
                            <i className="fa-solid fa-folder-open text-2xl mb-2 text-gray-300" />
                            <p>Hộp cát trống</p>
                        </div>
                    ) : (
                        backlogIssues.map(issue => (
                            <div
                                key={issue.issueId}
                                draggable
                                onDragStart={(e) => handleDragStart(e, issue.issueId)}
                                onDragEnd={handleDragEnd}
                                onClick={() => setSelectedIssue(issue)}
                                className={`p-3 bg-gray-50 hover:bg-white border hover:border-indigo-300 rounded-xl shadow-sm transition-all cursor-grab active:cursor-grabbing group relative
                                    ${draggedIssueId === issue.issueId ? 'opacity-40 border-dashed border-indigo-400' : 'border-gray-100'}`}
                            >
                                <div className="flex items-center justify-between mb-1.5 text-[10px]">
                                    <span className="font-mono text-gray-400 font-bold">{issue.issueKey}</span>
                                    <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_COLORS[issue.priority] || 'bg-gray-400'}`} title={`Độ ưu tiên: ${issue.priority}`} />
                                </div>
                                <h4 className="text-xs font-semibold text-gray-800 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                    {issue.title}
                                </h4>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
                                    <span className="truncate max-w-[120px]">{issue.assigneeName || 'Chưa giao'}</span>
                                    {issue.dueDate && (
                                        <span className="font-medium text-gray-500">Hạn: {formatDate(issue.dueDate)}</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT MAIN WORKSPACE: Eisenhower Matrix (Top) & Goals Month Grid (Bottom) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                
                {/* Header controls */}
                <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <i className="fa-solid fa-map text-indigo-500" />
                            Bản đồ lập kế hoạch kéo thả
                        </h2>
                        <p className="text-xs text-gray-500">Kéo thả công việc từ hộp cát trái vào ma trận ưu tiên hoặc các tháng kế hoạch</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(Number(e.target.value))}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 hover:bg-gray-100 transition-colors font-bold text-gray-700 focus:outline-none focus:border-indigo-400"
                        >
                            {availableYears.length > 0 ? availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            )) : (
                                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                            )}
                        </select>
                        {canManageGoals && (
                            <button
                                onClick={handleOpenCreateGoal}
                                className="btn-primary py-1.5 px-3 flex items-center gap-1.5 text-xs font-bold shadow-md shadow-indigo-100"
                            >
                                <i className="fa-solid fa-plus text-[10px]" />
                                Thêm mục tiêu
                            </button>
                        )}
                    </div>
                </div>

                {/* SECTION 1: MA TRẬN EISENHOWER KÉO THẢ */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                        <h3 className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                            <i className="fa-solid fa-square-poll-horizontal text-indigo-500 text-sm" />
                            MA TRẬN QUYẾT SÁCH (EISENHOWER MATRIX)
                        </h3>
                        <span className="text-[10px] text-gray-400 italic">Thả vào ô vuông để đổi độ ưu tiên lập tức</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {QUADRANTS.map(q => (
                            <div
                                key={q.id}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDropQuadrant(e, q.id)}
                                className={`rounded-xl border-2 ${q.border} ${q.bg} p-4 min-h-[160px] transition-all flex flex-col group`}
                            >
                                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${q.color} flex items-center justify-center text-white shadow-sm`}>
                                        <i className={`fa-solid ${q.icon} text-xs`} />
                                    </div>
                                    <div>
                                        <h4 className={`text-xs font-extrabold ${q.text}`}>{q.title}</h4>
                                        <p className="text-[9px] text-gray-400 font-semibold">{q.subtitle}</p>
                                    </div>
                                    <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-black ${q.text} bg-white shadow-sm`}>
                                        {quadrantData[q.id].length}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                                    {quadrantData[q.id].length === 0 ? (
                                        <div className="h-full flex items-center justify-center py-8 text-[10px] text-gray-400 italic">
                                            Kéo thả task vào đây
                                        </div>
                                    ) : (
                                        quadrantData[q.id].map(issue => (
                                            <div
                                                key={issue.issueId}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, issue.issueId)}
                                                onDragEnd={handleDragEnd}
                                                onClick={() => setSelectedIssue(issue)}
                                                className="bg-white rounded-lg p-2 border border-gray-100 shadow-sm hover:shadow transition-shadow cursor-grab active:cursor-grabbing text-left flex items-center justify-between"
                                            >
                                                <div className="truncate flex-1 pr-3">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className="text-[9px] font-mono text-gray-400 font-bold">{issue.issueKey}</span>
                                                        <span className="text-[9px] text-gray-400">| {issue.assigneeName || 'Chưa giao'}</span>
                                                    </div>
                                                    <p className="text-xs font-semibold text-gray-700 line-clamp-1">{issue.title}</p>
                                                </div>
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_COLORS[issue.priority] || 'bg-gray-400'}`} />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SECTION 2: BẢN ĐỒ MỤC TIÊU & HẠN CHÓT 12 THÁNG */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                        <h3 className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                            <i className="fa-solid fa-bullseye text-indigo-500 text-sm" />
                            KẾ HOẠCH MỤC TIÊU & HẠN CHÓT 12 THÁNG ({filterYear})
                        </h3>
                        <span className="text-[10px] text-gray-400 italic">Thả vào ô Tháng để cài hạn chót của công việc về cuối tháng đó</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(monthNum => {
                            const monthGoals = goalsByMonth[monthNum] || [];
                            const monthIssues = issuesByMonth[monthNum] || [];
                            const data = progressByMonth[monthNum] || { completed: 0, total: 0, pct: 0 };
                            const isCurrentMonth = new Date().getMonth() + 1 === monthNum && new Date().getFullYear() === filterYear;

                            return (
                                <div
                                    key={monthNum}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDropMonth(e, monthNum)}
                                    className={`rounded-xl border p-4 shadow-sm flex flex-col min-h-[220px] transition-all
                                        ${isCurrentMonth ? 'ring-2 ring-indigo-300 border-indigo-200 bg-indigo-50/10' : 'border-gray-100 bg-white hover:border-indigo-100'}`}
                                >
                                    {/* Month Header */}
                                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                                        <span className={`text-xs font-extrabold ${isCurrentMonth ? 'text-indigo-700' : 'text-gray-700'}`}>
                                            {MONTHS[monthNum - 1]}
                                        </span>
                                        {isCurrentMonth && (
                                            <span className="text-[8px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-black animate-pulse">HIỆN TẠI</span>
                                        )}
                                    </div>

                                    {/* Progress meter */}
                                    {monthGoals.length > 0 && (
                                        <div className="mb-3 flex-shrink-0 bg-gray-50 rounded-lg p-2 border border-gray-100">
                                            <div className="flex items-center justify-between text-[9px] font-bold text-gray-500 mb-1">
                                                <span>Mục tiêu: {data.completed}/{data.total}</span>
                                                <span>{data.pct}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${data.pct === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${data.pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Interactive Monthly Goals List */}
                                    <div className="space-y-1.5 mb-3 flex-shrink-0">
                                        {monthGoals.map(goal => (
                                            <div
                                                key={goal.goalId}
                                                className={`group/goal flex items-center gap-2 p-1.5 rounded-lg border text-[10px] transition-colors
                                                    ${goal.isCompleted ? 'border-green-150 bg-green-50/20 text-green-700' : 'border-gray-100 bg-gray-50'}`}
                                            >
                                                <button
                                                    onClick={() => toggleGoalMutation.mutate(goal.goalId)}
                                                    disabled={toggleGoalMutation.isPending}
                                                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors
                                                        ${goal.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-500'}`}
                                                >
                                                    {goal.isCompleted && <i className="fa-solid fa-check text-[7px]" />}
                                                </button>
                                                <span className={`font-semibold truncate flex-1 ${goal.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                                    {goal.title}
                                                </span>
                                                {canManageGoals && (
                                                    <div className="opacity-0 group-hover/goal:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ml-1">
                                                        <button onClick={(e) => handleOpenEditGoal(goal, e)} className="text-gray-400 hover:text-indigo-600" title="Sửa">
                                                            <i className="fa-solid fa-pen text-[8px]" />
                                                        </button>
                                                        <button onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm('Xóa mục tiêu?')) deleteGoalMutation.mutate(goal.goalId);
                                                        }} className="text-gray-400 hover:text-red-600" title="Xóa">
                                                            <i className="fa-solid fa-trash text-[8px]" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Issues Assigned to this Month (due dates) */}
                                    <div className="flex-1 border-t border-dashed border-gray-100 pt-2 flex flex-col">
                                        <div className="flex items-center justify-between text-[9px] text-gray-400 font-bold mb-1.5 flex-shrink-0">
                                            <span>Task hết hạn:</span>
                                            <span>{monthIssues.length} task</span>
                                        </div>
                                        <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[140px] custom-scrollbar pr-1">
                                            {monthIssues.length === 0 ? (
                                                <div className="h-full flex items-center justify-center text-[9px] text-gray-450 italic py-6">
                                                    Kéo thả task vào tháng này
                                                </div>
                                            ) : (
                                                monthIssues.map(issue => (
                                                    <div
                                                        key={issue.issueId}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, issue.issueId)}
                                                        onDragEnd={handleDragEnd}
                                                        onClick={() => setSelectedIssue(issue)}
                                                        className="bg-gray-50/70 hover:bg-white rounded-lg p-1.5 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing text-left flex items-center justify-between"
                                                    >
                                                        <div className="truncate flex-1 pr-2">
                                                            <p className="text-[9px] font-mono text-gray-400 font-bold">{issue.issueKey}</p>
                                                            <p className="text-[10px] font-semibold text-gray-700 line-clamp-1">{issue.title}</p>
                                                        </div>
                                                        <span className={`w-1 h-1 rounded-full shrink-0 ${PRIORITY_COLORS[issue.priority] || 'bg-gray-400'}`} />
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* Create/Edit Goal Modal */}
            {showGoalModal && (
                <GoalModal
                    projectId={projectId}
                    goal={editingGoal}
                    defaultYear={filterYear}
                    onClose={() => { setShowGoalModal(false); setEditingGoal(null); }}
                    onSuccess={() => {
                        queryClient.invalidateQueries(['project-goals', projectId]);
                        queryClient.invalidateQueries(['project-goals-all', projectId]);
                        setShowGoalModal(false);
                        setEditingGoal(null);
                    }}
                />
            )}

            {/* Issue Detail Drawer/Modal */}
            {selectedIssue && (
                <IssueDetailModal
                    issue={selectedIssue}
                    onClose={() => setSelectedIssue(null)}
                    onUpdate={() => {
                        queryClient.invalidateQueries(['project-issues-planner', projectId]);
                        queryClient.invalidateQueries(['project-issues-calendar', projectId]);
                    }}
                />
            )}

        </div>
    );
}

function GoalModal({ projectId, goal, defaultYear, onClose, onSuccess }) {
    const [form, setForm] = useState({
        title: goal?.title || '',
        month: goal?.month || new Date().getMonth() + 1,
        year: goal?.year || defaultYear || new Date().getFullYear(),
    });
    const toast = useToast();
    const queryClient = useQueryClient();
    const isEditing = !!goal;

    const mutation = useMutation({
        mutationFn: async (data) => {
            if (isEditing) {
                // Delete then Recreate
                await apiClient.delete(`/api/projects/${projectId}/goals/${goal.goalId}`);
            }
            return apiClient.post(`/api/projects/${projectId}/goals`, data);
        },
        onSuccess: () => {
            toast.success(isEditing ? 'Đã cập nhật mục tiêu' : 'Đã thêm mục tiêu');
            onSuccess();
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            toast.error('Vui lòng nhập mục tiêu');
            return;
        }
        mutation.mutate(form);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                    <h3 className="text-base font-bold text-gray-900">
                        {isEditing ? 'Sửa mục tiêu tháng' : 'Thêm mục tiêu tháng mới'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-650 transition-colors">
                        <i className="fa-solid fa-times text-sm" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tiêu đề mục tiêu</label>
                        <textarea
                            value={form.title}
                            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 resize-none"
                            placeholder="Ví dụ: Đạt 100% tài liệu kiến trúc kỹ thuật"
                            rows={3}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tháng</label>
                            <select
                                value={form.month}
                                onChange={(e) => setForm(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-400"
                            >
                                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Năm</label>
                            <input
                                type="number"
                                value={form.year}
                                onChange={(e) => setForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                                min={2020}
                                max={2100}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-all">
                            Hủy
                        </button>
                        <button type="submit" disabled={mutation.isPending} className="btn-primary py-2 px-4 text-xs font-bold">
                            {mutation.isPending ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm mục tiêu'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

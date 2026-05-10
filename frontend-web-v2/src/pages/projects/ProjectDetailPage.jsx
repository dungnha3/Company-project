import { useState, lazy, Suspense, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatDate, formatDateTime } from '@shared/utils/formatters';
import ProjectBoard from './tabs/ProjectBoard';
import ProjectGantt from './tabs/ProjectGantt';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

import EditProjectModal from './components/EditProjectModal';
import ExportDropdown from './components/ExportDropdown';

// Lazy load new feature tabs
const AnalyticsPage = lazy(() => import('./AnalyticsPage'));
const SprintTab = lazy(() => import('./tabs/SprintTab'));
const PhaseTab = lazy(() => import('./tabs/PhaseTab'));
const IssueListTab = lazy(() => import('./tabs/IssueListTab'));
const ProjectSettingsTab = lazy(() => import('./tabs/ProjectSettingsTab'));
const ProjectCalendarTab = lazy(() => import('./tabs/ProjectCalendarTab'));
const EisenhowerMatrixTab = lazy(() => import('./tabs/EisenhowerMatrixTab'));
const TimelineTab = lazy(() => import('./tabs/TimelineTab'));
const TeamTab = lazy(() => import('./tabs/TeamTab'));
const ProjectCostTab = lazy(() => import('./tabs/ProjectCostTab'));
const ProjectPerformanceTab = lazy(() => import('./tabs/ProjectPerformanceTab'));
const ProjectStorageTab = lazy(() => import('./tabs/ProjectStorageTab'));

const PageLoader = () => <div className="flex items-center justify-center h-64"><i className="fa-solid fa-spinner fa-spin text-2xl text-primary" /></div>;

export default function ProjectDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [showEditModal, setShowEditModal] = useState(false);
    const { currentWorkspace } = useWorkspaceStore();
    const settings = currentWorkspace?.settings || null;

    const { data: project, isLoading } = useQuery({
        queryKey: ['project', id],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.BY_ID(id))).data,
    });

    // Organize tabs into logical groups (2-tier navigation)
    const VIEW_GROUPS = useMemo(() => {
        return [
            {
                id: 'overview_group',
                label: 'Tổng quan',
                icon: 'fa-chart-simple',
                tabs: [{ id: 'overview', label: 'Tổng quan' }]
            },
            {
                id: 'work_group',
                label: 'Quản lý Công việc',
                icon: 'fa-layer-group',
                tabs: [
                    { id: 'board', label: 'Bảng (Kanban)' },
                    { id: 'list', label: 'Danh sách' },
                    { id: 'sprints', label: 'Sprints' },
                    { id: 'phases', label: 'Giai đoạn' }
                ]
            },
            {
                id: 'planning_group',
                label: 'Lập kế hoạch',
                icon: 'fa-timeline',
                tabs: [
                    { id: 'gantt', label: 'Gantt Chart' },
                    { id: 'timeline', label: 'Timeline' },
                    { id: 'eisenhower', label: 'Eisenhower' },
                    { id: 'calendar', label: 'Lịch công việc' }
                ]
            },
            {
                id: 'hr_group',
                label: 'Nhân sự & Nguồn lực',
                icon: 'fa-users-gear',
                tabs: [
                    { id: 'team', label: 'Thành viên' },
                    { id: 'performance', label: 'Đánh giá hiệu suất' },
                    { id: 'costs', label: 'Chi phí dự án' }
                ]
            },
            {
                id: 'more_group',
                label: 'Mở rộng',
                icon: 'fa-ellipsis',
                tabs: [
                    { id: 'analytics', label: 'Thống kê nâng cao' },
                    { id: 'files', label: 'Tài liệu' },
                    { id: 'webhook', label: 'Webhooks' },
                    { id: 'settings', label: 'Cài đặt' }
                ]
            }
        ];
    }, [settings]);

    const activeGroup = useMemo(() => {
        return VIEW_GROUPS.find(g => g.tabs.some(t => t.id === activeTab)) || VIEW_GROUPS[0];
    }, [activeTab, VIEW_GROUPS]);

    if (isLoading) return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-3xl text-primary" /></div>;
    if (!project) return <div className="p-8 text-center text-red-500">Không tìm thấy dự án</div>;

    // Check if calendar/timelogs are enabled for quick links
    const showCalendar = true;
    const showTimelogs = true;

    return (
        <div className="space-y-6">
            {/* Header with Breadcrumb and Actions */}
            <div className="flex flex-col gap-4">
                <button onClick={() => navigate('/app/projects')} className="text-gray-500 hover:text-gray-900 w-fit flex items-center gap-1 transition-colors">
                    <i className="fa-solid fa-arrow-left" /> Quay lại danh sách
                </button>

                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                        <p className="text-gray-500 mt-1 max-w-2xl line-clamp-2">{project.description}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        {showCalendar && (
                            <Link to="/app/me/calendar" className="bg-white dark:bg-slate-800 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                <i className="fa-solid fa-calendar mr-2" />Lịch
                            </Link>
                        )}
                        {showTimelogs && (
                            <Link to="/app/me/timelogs" className="bg-white dark:bg-slate-800 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                <i className="fa-solid fa-clock mr-2" />Nhật ký
                            </Link>
                        )}
                        <ExportDropdown projectId={project.projectId} projectName={project.name} />
                        <button onClick={() => setShowEditModal(true)} className="btn-primary px-4 py-2 rounded-lg flex items-center">
                            <i className="fa-solid fa-pen mr-2" />Sửa
                        </button>
                    </div>
                </div>

                {/* Meta Info Bar */}
                <div className="flex gap-6 text-sm text-gray-600 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2">
                        <i className="fa-regular fa-calendar text-primary" />
                        <span>Bắt đầu: <span className="font-medium text-gray-900">{project.startDate ? formatDate(project.startDate) : 'N/A'}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-flag-checkered text-red-500" />
                        <span>Kết thúc: <span className="font-medium text-gray-900">{project.endDate ? formatDate(project.endDate) : 'N/A'}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-chart-pie text-indigo-500" />
                        <span>Trạng thái: <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">{project.status}</span></span>
                    </div>
                </div>
            </div>

            {/* Two-tier Tabs Navigation */}
            <div className="flex flex-col gap-3">
                {/* Tier 1: Main Groups */}
                <div className="border-b border-gray-200 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    <nav className="flex space-x-6 min-w-max px-2" aria-label="Tab Groups">
                        {VIEW_GROUPS.map((group) => (
                            <button
                                key={group.id}
                                onClick={() => setActiveTab(group.tabs[0].id)}
                                className={`
                                    whitespace-nowrap py-3 border-b-2 font-bold text-[15px] flex items-center gap-2 transition-all
                                    ${activeGroup.id === group.id
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}
                                `}
                            >
                                <i className={`fa-solid ${group.icon}`} />
                                {group.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tier 2: Sub-tabs */}
                {activeGroup.tabs.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                        {activeGroup.tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                                    ${activeTab === tab.id
                                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm'
                                        : 'text-gray-600 bg-white hover:bg-gray-100 border border-gray-200'}
                                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">
                {activeTab === 'overview' && <OverviewTab project={project} />}
                {activeTab === 'board' && <ProjectBoard project={project} />}
                {activeTab === 'sprints' && (
                    <Suspense fallback={<PageLoader />}>
                        <SprintTab projectId={project.projectId} />
                    </Suspense>
                )}
                {activeTab === 'phases' && (
                    <Suspense fallback={<PageLoader />}>
                        <PhaseTab projectId={project.projectId} />
                    </Suspense>
                )}
                {activeTab === 'list' && (
                    <Suspense fallback={<PageLoader />}>
                        <IssueListTab projectId={project.projectId} />
                    </Suspense>
                )}
                {activeTab === 'gantt' && <ProjectGantt project={project} />}
                {activeTab === 'calendar' && (
                    <Suspense fallback={<PageLoader />}>
                        <ProjectCalendarTab projectId={project.projectId} />
                    </Suspense>
                )}
                {activeTab === 'eisenhower' && (
                    <Suspense fallback={<PageLoader />}>
                        <EisenhowerMatrixTab projectId={project.projectId} />
                    </Suspense>
                )}
                {activeTab === 'timeline' && (
                    <Suspense fallback={<PageLoader />}>
                        <TimelineTab projectId={project.projectId} />
                    </Suspense>
                )}
                {activeTab === 'analytics' && (
                    <Suspense fallback={<PageLoader />}>
                        <AnalyticsPage />
                    </Suspense>
                )}
                {activeTab === 'webhook' && (
                    <div className="card p-6 text-center">
                        <i className="fa-solid fa-link text-4xl text-indigo-500 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Webhook Integration</h3>
                        <p className="text-gray-500">Cài đặt webhook trong Company Settings để kết nối với hệ thống bên ngoài.</p>
                    </div>
                )}
                { activeTab === 'files' && (
                    <Suspense fallback={<PageLoader />}>
                        <ProjectStorageTab projectId={project.projectId} />
                    </Suspense>
                )}
                {activeTab === 'team' && (
                    <Suspense fallback={<PageLoader />}>
                        <TeamTab projectId={id} />
                    </Suspense>
                )}
                {activeTab === 'settings' && (
                    <Suspense fallback={<PageLoader />}>
                        <ProjectSettingsTab project={project} />
                    </Suspense>
                )}
                {activeTab === 'costs' && (
                    <Suspense fallback={<PageLoader />}>
                        <ProjectCostTab projectId={project.projectId} />
                    </Suspense>
                )}
                {activeTab === 'performance' && (
                    <Suspense fallback={<PageLoader />}>
                        <ProjectPerformanceTab projectId={project.projectId} />
                    </Suspense>
                )}
            </div>

            {/* Edit Project Modal */}
            {showEditModal && (
                <EditProjectModal
                    project={project}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={() => setShowEditModal(false)}
                />
            )}
        </div>
    );
}

function OverviewTab({ project }) {
    const queryClient = useQueryClient();
    const [newGoalTitle, setNewGoalTitle] = useState('');
    const now = new Date();
    const [goalMonth, setGoalMonth] = useState(now.getMonth() + 1);
    const [goalYear, setGoalYear] = useState(now.getFullYear());
    const [activityPage, setActivityPage] = useState(1);
    const ACTIVITIES_PER_PAGE = 5;

    const { data: activitiesData, isLoading } = useQuery({
        queryKey: ['project-activities', project.projectId],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.ACTIVITIES.BY_PROJECT(project.projectId));
            return response.data?.content || response.data || [];
        },
    });

    const { data: members = [] } = useQuery({
        queryKey: ['projectMembers', project.projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.MEMBERS(project.projectId))).data,
        enabled: !!project?.projectId,
    });

    const { data: goals = [] } = useQuery({
        queryKey: ['project-goals', project.projectId, goalMonth, goalYear],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.GOALS(project.projectId), { params: { month: goalMonth, year: goalYear } })).data,
        enabled: !!project?.projectId,
    });

    const addGoalMutation = useMutation({
        mutationFn: async () => {
            await apiClient.post(ENDPOINTS.PROJECTS.GOALS(project.projectId), {
                title: newGoalTitle.trim(), month: goalMonth, year: goalYear,
            });
        },
        onSuccess: () => {
            setNewGoalTitle('');
            queryClient.invalidateQueries(['project-goals', project.projectId]);
        },
    });

    const toggleGoalMutation = useMutation({
        mutationFn: async (goalId) => {
            await apiClient.patch(ENDPOINTS.PROJECTS.GOAL_TOGGLE(project.projectId, goalId));
        },
        onSuccess: () => queryClient.invalidateQueries(['project-goals', project.projectId]),
    });

    const deleteGoalMutation = useMutation({
        mutationFn: async (goalId) => {
            await apiClient.delete(ENDPOINTS.PROJECTS.GOAL_DELETE(project.projectId, goalId));
        },
        onSuccess: () => queryClient.invalidateQueries(['project-goals', project.projectId]),
    });

    const activities = Array.isArray(activitiesData) ? activitiesData : (activitiesData?.content || []);
    const totalActivityPages = Math.max(1, Math.ceil(activities.length / ACTIVITIES_PER_PAGE));
    const paginatedActivities = activities.slice((activityPage - 1) * ACTIVITIES_PER_PAGE, activityPage * ACTIVITIES_PER_PAGE);
    const completedGoals = goals.filter(g => g.isCompleted).length;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Hoạt động gần đây</h3>
                        {activities.length > 0 && (
                            <span className="text-xs text-gray-400">{activities.length} hoạt động</span>
                        )}
                    </div>
                    {isLoading ? (
                        <div className="text-center py-4"><i className="fa-solid fa-spinner fa-spin text-gray-400" /></div>
                    ) : activities.length === 0 ? (
                        <p className="text-gray-500 italic">Chưa có hoạt động nào.</p>
                    ) : (
                        <>
                            <div className="space-y-3">
                                {paginatedActivities.map(act => (
                                    <ActivityItem key={act.activityId || act.id} act={act} />
                                ))}
                            </div>
                            {totalActivityPages > 1 && (
                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                                    <button
                                        onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                                        disabled={activityPage === 1}
                                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <i className="fa-solid fa-chevron-left mr-1" />Trước
                                    </button>
                                    <span className="text-xs text-gray-500">
                                        Trang {activityPage}/{totalActivityPages}
                                    </span>
                                    <button
                                        onClick={() => setActivityPage(p => Math.min(totalActivityPages, p + 1))}
                                        disabled={activityPage === totalActivityPages}
                                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Sau<i className="fa-solid fa-chevron-right ml-1" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            <div className="space-y-6">
                {/* Goals Section */}
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <i className="fa-solid fa-bullseye text-emerald-500" /> Mục tiêu
                        </h3>
                        <div className="flex items-center gap-1 text-xs">
                            <select value={goalMonth} onChange={e => setGoalMonth(Number(e.target.value))}
                                className="border border-gray-200 rounded px-1.5 py-1 text-xs">
                                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>T{i + 1}</option>)}
                            </select>
                            <select value={goalYear} onChange={e => setGoalYear(Number(e.target.value))}
                                className="border border-gray-200 rounded px-1.5 py-1 text-xs">
                                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y =>
                                    <option key={y} value={y}>{y}</option>
                                )}
                            </select>
                        </div>
                    </div>
                    {goals.length > 0 && (
                        <div className="mb-3">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>{completedGoals}/{goals.length} hoàn thành</span>
                                <span>{Math.round((completedGoals / goals.length) * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${(completedGoals / goals.length) * 100}%` }} />
                            </div>
                        </div>
                    )}
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto mb-3">
                        {goals.map(g => (
                            <div key={g.goalId} className="flex items-center gap-2 group hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors">
                                <button onClick={() => toggleGoalMutation.mutate(g.goalId)}
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${g.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-emerald-400'}`}>
                                    {g.isCompleted && <i className="fa-solid fa-check text-[10px]" />}
                                </button>
                                <span className={`text-sm flex-1 ${g.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>{g.title}</span>
                                <button onClick={() => deleteGoalMutation.mutate(g.goalId)}
                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs transition-opacity">
                                    <i className="fa-solid fa-trash-can" />
                                </button>
                            </div>
                        ))}
                        {goals.length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">Chưa có mục tiêu</p>}
                    </div>
                    <div className="flex gap-2">
                        <input type="text" value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && newGoalTitle.trim() && addGoalMutation.mutate()}
                            placeholder="Thêm mục tiêu mới..."
                            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                        <button onClick={() => newGoalTitle.trim() && addGoalMutation.mutate()}
                            disabled={!newGoalTitle.trim() || addGoalMutation.isPending}
                            className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 disabled:opacity-50">
                            <i className="fa-solid fa-plus" />
                        </button>
                    </div>
                </div>

                <div className="card p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Thống kê</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600 dark:text-gray-400">Tiến độ dự án</span>
                                <span className="font-bold">{project.progress || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${project.progress || 0}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="card p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Thành viên ({members.length})</h3>
                    <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto">
                        {members.map(m => (
                            <div key={m.userId} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                    {m.fullName?.charAt(0)}
                                </div>
                                <div className="overflow-hidden">
                                    <div className="text-sm font-medium text-gray-900 truncate">{m.fullName}</div>
                                    <div className="text-xs text-gray-500 truncate">{m.email}</div>
                                </div>
                            </div>
                        ))}
                        {members.length === 0 && <p className="text-gray-500 text-sm">Chưa có thành viên.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

const ACTIVITY_ICONS = {
    CREATED: { icon: 'fa-plus', bg: 'bg-green-100', text: 'text-green-600' },
    STATUS_CHANGED: { icon: 'fa-arrow-right-arrow-left', bg: 'bg-blue-100', text: 'text-blue-600' },
    ASSIGNEE_CHANGED: { icon: 'fa-user-pen', bg: 'bg-purple-100', text: 'text-purple-600' },
    PRIORITY_CHANGED: { icon: 'fa-flag', bg: 'bg-amber-100', text: 'text-amber-600' },
    SPRINT_CHANGED: { icon: 'fa-layer-group', bg: 'bg-cyan-100', text: 'text-cyan-600' },
    DUE_DATE_CHANGED: { icon: 'fa-calendar-day', bg: 'bg-orange-100', text: 'text-orange-600' },
    TITLE_CHANGED: { icon: 'fa-pen', bg: 'bg-gray-100', text: 'text-gray-600' },
    DESCRIPTION_CHANGED: { icon: 'fa-align-left', bg: 'bg-gray-100', text: 'text-gray-600' },
    COMMENT_ADDED: { icon: 'fa-comment', bg: 'bg-indigo-100', text: 'text-indigo-600' },
    COMMENT_EDITED: { icon: 'fa-comment-dots', bg: 'bg-indigo-100', text: 'text-indigo-500' },
    COMMENT_DELETED: { icon: 'fa-comment-slash', bg: 'bg-red-100', text: 'text-red-500' },
    ESTIMATED_HOURS_CHANGED: { icon: 'fa-clock', bg: 'bg-teal-100', text: 'text-teal-600' },
    ACTUAL_HOURS_CHANGED: { icon: 'fa-hourglass-half', bg: 'bg-teal-100', text: 'text-teal-600' },
};

function ActivityItem({ act }) {
    const style = ACTIVITY_ICONS[act.activityType] || { icon: 'fa-circle-info', bg: 'bg-gray-100', text: 'text-gray-500' };
    const userName = act.userName || 'Người dùng';

    return (
        <div className="flex gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0 group hover:bg-gray-50/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
            <div className={`w-8 h-8 rounded-full ${style.bg} flex items-center justify-center ${style.text} shrink-0`}>
                <i className={`fa-solid ${style.icon} text-xs`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 leading-relaxed">
                    {act.description || (
                        <>
                            <span className="font-semibold">{userName}</span>{' '}
                            đã thực hiện thay đổi
                            {act.issueTitle && (
                                <> trong <span className="font-medium text-indigo-600">'{act.issueTitle}'</span></>
                            )}
                        </>
                    )}
                </p>
                {act.oldValue && act.newValue && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs flex-wrap">
                        <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded line-through">{act.oldValue}</span>
                        <i className="fa-solid fa-arrow-right text-gray-300 text-[10px]" />
                        <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded font-medium">{act.newValue}</span>
                    </div>
                )}
                <p className="text-xs text-gray-400 mt-1">{formatDateTime(act.createdAt)}</p>
            </div>
        </div>
    );
}

import { useState, lazy, Suspense, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatDate, formatDateTime } from '@shared/utils/formatters';
import ProjectBoard from './tabs/ProjectBoard';
import ProjectGantt from './tabs/ProjectGantt';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { isProjectFeatureEnabled } from '@shared/utils/featureHelper';
import EditProjectModal from './components/EditProjectModal';
import ExportDropdown from './components/ExportDropdown';

// Lazy load new feature tabs
const AnalyticsPage = lazy(() => import('./AnalyticsPage'));
const SprintTab = lazy(() => import('./tabs/SprintTab'));
const PhaseTab = lazy(() => import('./tabs/PhaseTab'));
const IssueListTab = lazy(() => import('./tabs/IssueListTab'));
const ProjectSettingsTab = lazy(() => import('./tabs/ProjectSettingsTab'));

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

    // Filter tabs based on feature settings
    const tabs = useMemo(() => {
        const baseTabs = [
            { id: 'overview', label: 'Tổng quan', icon: 'fa-chart-simple' },
            { id: 'board', label: 'Bảng (Kanban)', icon: 'fa-columns' },
            { id: 'sprints', label: 'Sprints', icon: 'fa-layer-group' },
            { id: 'phases', label: 'Giai đoạn', icon: 'fa-diagram-project' },
            { id: 'list', label: 'Danh sách việc', icon: 'fa-list-check' },
            { id: 'gantt', label: 'Gantt Chart', icon: 'fa-timeline' },
        ];

        if (isProjectFeatureEnabled(settings, 'analytics')) {
            baseTabs.push({ id: 'analytics', label: 'Thống kê', icon: 'fa-chart-line' });
        }
        // Webhook integration replaces removed Automation module
        if (isProjectFeatureEnabled(settings, 'webhook')) {
            baseTabs.push({ id: 'webhook', label: 'Webhooks', icon: 'fa-link' });
        }
        baseTabs.push({ id: 'settings', label: 'Cài đặt', icon: 'fa-gear' });

        return baseTabs;
    }, [settings]);

    if (isLoading) return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-3xl text-primary" /></div>;
    if (!project) return <div className="p-8 text-center text-red-500">Không tìm thấy dự án</div>;

    // Check if calendar/timelogs are enabled for quick links
    const showCalendar = isProjectFeatureEnabled(settings, 'calendar');
    const showTimelogs = isProjectFeatureEnabled(settings, 'timeTracking');

    return (
        <div className="space-y-6">
            {/* Header with Breadcrumb and Actions */}
            <div className="flex flex-col gap-4">
                <button onClick={() => navigate('/app/projects')} className="text-gray-500 hover:text-gray-900 w-fit flex items-center gap-1">
                    <i className="fa-solid fa-arrow-left" /> Quay lại danh sách
                </button>

                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                        <p className="text-gray-500 mt-1 max-w-2xl">{project.description}</p>
                    </div>
                    <div className="flex gap-2">
                        {showCalendar && (
                            <Link to="/app/me/calendar" className="bg-white dark:bg-slate-800 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                <i className="fa-solid fa-calendar mr-2" />Lịch
                            </Link>
                        )}
                        {showTimelogs && (
                            <Link to="/app/me/timelogs" className="bg-white dark:bg-slate-800 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                <i className="fa-solid fa-clock mr-2" />Nhật ký giờ
                            </Link>
                        )}
                        <ExportDropdown projectId={project.projectId} projectName={project.name} />
                        <button onClick={() => setShowEditModal(true)} className="btn-primary">
                            <i className="fa-solid fa-pen mr-2" />Chỉnh sửa
                        </button>
                    </div>
                </div>

                {/* Meta Info Bar */}
                <div className="flex gap-6 text-sm text-gray-600 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2">
                        <i className="fa-regular fa-calendar text-primary" />
                        <span>Start: {project.startDate ? formatDate(project.startDate) : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-flag-checkered text-red-500" />
                        <span>End: {project.endDate ? formatDate(project.endDate) : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-chart-pie text-indigo-500" />
                        <span>Status: {project.status}</span>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                                ${activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <i className={`fa-solid ${tab.icon}`} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
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
                {activeTab === 'settings' && (
                    <Suspense fallback={<PageLoader />}>
                        <ProjectSettingsTab project={project} />
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
    const { data: activitiesData, isLoading } = useQuery({
        queryKey: ['project-activities', project.projectId],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.ACTIVITIES.BY_PROJECT(project.projectId));
            return response.data?.content || response.data || [];
        },
    });

    const activities = activitiesData?.content || [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="card p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Hoạt động gần đây</h3>
                    {isLoading ? (
                        <div className="text-center py-4"><i className="fa-solid fa-spinner fa-spin text-gray-400" /></div>
                    ) : activities.length === 0 ? (
                        <p className="text-gray-500 italic">Chưa có hoạt động nào.</p>
                    ) : (
                        <div className="space-y-4">
                            {activities.map(act => (
                                <div key={act.activityId || act.id} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                                        {act.user?.fullName?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-900">
                                            <span className="font-medium">{act.user?.fullName}</span> {act.description}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {formatDateTime(act.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="space-y-6">
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
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Thành viên ({project.members?.length || 0})</h3>
                    <div className="flex flex-col gap-3">
                        {project.members?.map(m => (
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
                        {(!project.members || project.members.length === 0) && <p className="text-gray-500 text-sm">Chưa có thành viên.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

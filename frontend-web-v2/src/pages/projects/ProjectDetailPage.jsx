import { useState, lazy, Suspense, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatDate } from '@shared/utils/formatters';
import ProjectBoard from './tabs/ProjectBoard';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

import EditProjectModal from './components/EditProjectModal';
import ExportDropdown from './components/ExportDropdown';
import ProjectDashboardTab from './tabs/ProjectDashboardTab';

// Lazy load new feature tabs
const AnalyticsPage = lazy(() => import('./AnalyticsPage'));
const SprintTab = lazy(() => import('./tabs/SprintTab'));
const IssueListTab = lazy(() => import('./tabs/IssueListTab'));
const ProjectSettingsTab = lazy(() => import('./tabs/ProjectSettingsTab'));
const ProjectCalendarTab = lazy(() => import('./tabs/ProjectCalendarTab'));
const EisenhowerMatrixTab = lazy(() => import('./tabs/EisenhowerMatrixTab'));
const ProjectGoalTab = lazy(() => import('./tabs/ProjectGoalTab'));
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
                    { id: 'sprints', label: 'Sprints' }
                ]
            },
            {
                id: 'planning_group',
                label: 'Lập kế hoạch',
                icon: 'fa-timeline',
                tabs: [
                    { id: 'goals', label: 'Mục tiêu' },
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
            {/* Back Button - Prominent */}
            <button
                onClick={() => navigate('/app/projects')}
                className="group flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-gray-300 hover:bg-gray-50 transition-all w-fit"
            >
                <i className="fa-solid fa-arrow-left text-gray-400 group-hover:text-gray-700 transition-colors" />
                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">Quay lại danh sách</span>
            </button>

            {/* Project Info Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Card Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                        <p className="text-gray-500 mt-1 max-w-2xl line-clamp-2">{project.description}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        {showCalendar && (
                            <Link to="/app/me/calendar" className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium flex items-center gap-2">
                                <i className="fa-solid fa-calendar text-gray-500" />
                                Lịch
                            </Link>
                        )}
                        {showTimelogs && (
                            <Link to="/app/me/performance" className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium flex items-center gap-2">
                                <i className="fa-solid fa-clock text-gray-500" />
                                Nhật ký
                            </Link>
                        )}
                        <ExportDropdown projectId={project.projectId} projectName={project.name} />
                        <button onClick={() => setShowEditModal(true)} className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            <i className="fa-solid fa-pen" />
                            Sửa
                        </button>
                    </div>
                </div>

                {/* Meta Info Bar */}
                <div className="px-6 py-4 flex flex-wrap items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-calendar-day text-gray-400" />
                        <span>Bắt đầu: <span className="font-medium text-gray-900">{project.startDate ? formatDate(project.startDate) : 'N/A'}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-flag-checkered text-gray-400" />
                        <span>Kết thúc: <span className="font-medium text-gray-900">{project.endDate ? formatDate(project.endDate) : 'N/A'}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-chart-pie text-gray-400" />
                        <span>Trạng thái: <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{project.status}</span></span>
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
                {activeTab === 'overview' && <ProjectDashboardTab projectId={project.projectId} project={project} />}
                {activeTab === 'board' && <ProjectBoard project={project} />}
                {activeTab === 'sprints' && (
                    <Suspense fallback={<PageLoader />}>
                        <SprintTab projectId={project.projectId} />
                    </Suspense>
                )}
                {activeTab === 'list' && (
                    <Suspense fallback={<PageLoader />}>
                        <IssueListTab projectId={project.projectId} />
                    </Suspense>
                )}
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
                {activeTab === 'goals' && (
                    <Suspense fallback={<PageLoader />}>
                        <ProjectGoalTab projectId={project.projectId} />
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

// No local OverviewTab — tab content is rendered via ProjectDashboardTab

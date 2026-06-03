import { useState, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatDate } from '@shared/utils/formatters';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import CreateProjectModal from './components/CreateProjectModal';
import CreateIssueModal from './components/CreateIssueModal';

export default function ProjectsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = useWorkspaceStore();
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: projects, isLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            try {
                const response = (await apiClient.get(ENDPOINTS.PROJECTS.LIST)).data;
                return response?.content || response || [];
            } catch { return []; }
        },
    });

    const handleProjectCreated = () => {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
    };

    const handleIssueCreated = () => {
        queryClient.invalidateQueries({ queryKey: ['myIssues'] });
    };

    const filtered = (projects || [])
        .filter(p => p.status !== 'CANCELLED')
        .filter(p => {
            if (!searchTerm) return true;
            const s = searchTerm.toLowerCase();
            return (p.name || '').toLowerCase().includes(s) || (p.key || '').toLowerCase().includes(s);
        });

    return (
        <div className="max-w-full mx-auto p-6 space-y-6">
            {/* Header - Clean white card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-xl border border-gray-100 px-6 py-5 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-folder text-gray-500 text-xl" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Dự án</h1>
                        <p className="text-sm text-gray-500">Quản lý các dự án và tiến độ công việc</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {hasPermission('projectManageIssues') && (
                        <button
                            onClick={() => setShowIssueModal(true)}
                            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                            <i className="fa-solid fa-plus mr-1" /> Task
                        </button>
                    )}
                    {hasPermission('projectCreate') && (
                        <button
                            onClick={() => setShowProjectModal(true)}
                            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <i className="fa-solid fa-folder-plus mr-1" /> Tạo dự án
                        </button>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                        type="text"
                        placeholder="Tìm dự án theo tên hoặc mã..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white"
                    />
                </div>
                <span className="text-sm text-gray-500 font-medium">
                    {filtered.length} dự án
                </span>
            </div>

            {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="loading-spinner" />
                </div>
            ) : (
                <ProjectCardView projects={filtered} navigate={navigate} />
            )}

            {/* Modals */}
            <CreateProjectModal
                isOpen={showProjectModal}
                onClose={() => setShowProjectModal(false)}
                onSuccess={handleProjectCreated}
            />
            <CreateIssueModal
                isOpen={showIssueModal}
                onClose={() => setShowIssueModal(false)}
                onSuccess={handleIssueCreated}
            />
        </div>
    );
}


function ProjectCardView({ projects, navigate }) {
    if (!projects?.length) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-16 text-center shadow-sm">
                <div className="w-20 h-20 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <i className="fa-solid fa-rocket text-3xl text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Bắt đầu dự án đầu tiên!</h3>
                <p className="text-sm text-gray-400 mb-6 max-w-lg mx-auto">Tạo dự án để quản lý công việc, theo dõi tiến độ và cộng tác với đội ngũ.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
                <div
                    key={project.projectId}
                    onClick={() => navigate(`/app/projects/${project.projectId}`)}
                    className="group bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-lg">
                            <i className="fa-solid fa-folder-open" />
                        </div>
                        <StatusBadge status={project.status} />
                    </div>

                    <h3 className="font-medium text-gray-900 text-base mb-1 group-hover:text-gray-700 transition-colors">{project.name}</h3>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4 h-10">{project.description}</p>

                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Tiến độ</span>
                                <span className="font-medium text-gray-700">{project.progress || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="bg-gray-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${project.progress || 0}%` }}></div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-1">
                                <i className="fa-regular fa-calendar" />
                                {project.startDate ? formatDate(project.startDate) : 'N/A'}
                            </div>
                            <div className="flex -space-x-2">
                                {project.members?.slice(0, 3).map((m, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] text-gray-600 font-medium" title={m.fullName}>
                                        {m.fullName?.charAt(0)}
                                    </div>
                                ))}
                                {(project.members?.length > 3) && (
                                    <div className="w-6 h-6 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[9px] text-gray-500">+{project.members.length - 3}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

const StatusBadge = memo(function StatusBadge({ status }) {
    const configs = {
        ACTIVE: { color: 'bg-gray-100 text-gray-700', label: 'Đang hoạt động' },
        ON_HOLD: { color: 'bg-gray-100 text-gray-600', label: 'Tạm dừng' },
        OVERDUE: { color: 'bg-amber-50 text-amber-700', label: 'Quá hạn' },
        COMPLETED: { color: 'bg-green-50 text-green-700', label: 'Hoàn thành' },
        CANCELLED: { color: 'bg-red-50 text-red-700', label: 'Đã hủy' },
    };

    const config = configs[status] || configs.ACTIVE;

    return (
        <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${config.color}`}>
            {config.label}
        </span>
    );
});

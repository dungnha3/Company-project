import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import DataTable from '@shared/components/ui/DataTable';
import CreateProjectModal from './components/CreateProjectModal';
import CreateIssueModal from './components/CreateIssueModal';

export default function ProjectsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'card'
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);

    const { data: projects, isLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            try {
                const response = (await apiClient.get(ENDPOINTS.PROJECTS.LIST)).data;
                return response?.content || response || [];
            } catch {
                return [];
            }
        },
    });

    const handleProjectCreated = (project) => {
        queryClient.invalidateQueries(['projects']);
    };

    const handleIssueCreated = (issue) => {
        queryClient.invalidateQueries(['myIssues']);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dự án</h1>
                    <p className="text-gray-500 text-sm">Quản lý các dự án và tiến độ công việc</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-gray-100 p-1 rounded-lg flex">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <i className="fa-solid fa-list mr-1" /> List
                        </button>
                        <button
                            onClick={() => setViewMode('card')}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewMode === 'card' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <i className="fa-solid fa-grid-2 mr-1" /> Card
                        </button>
                    </div>
                    <button
                        onClick={() => setShowIssueModal(true)}
                        className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <i className="fa-solid fa-plus mr-1" /> Task
                    </button>
                    <button
                        onClick={() => setShowProjectModal(true)}
                        className="btn-primary shadow-lg shadow-primary/20"
                    >
                        <i className="fa-solid fa-folder-plus mr-1" /> Tạo dự án
                    </button>
                </div>
            </div>

            {/* TODO: Add Filters here */}

            {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                    <i className="fa-solid fa-spinner fa-spin text-3xl text-primary" />
                </div>
            ) : viewMode === 'list' ? (
                <ProjectListView projects={projects} navigate={navigate} />
            ) : (
                <ProjectCardView projects={projects} navigate={navigate} />
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

function ProjectListView({ projects, navigate }) {
    const columns = [
        {
            header: 'Tên dự án',
            accessorKey: 'name',
            cell: (row) => (
                <div>
                    <div className="font-semibold text-gray-900">{row.name}</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">{row.description}</div>
                </div>
            )
        },
        {
            header: 'Trạng thái',
            accessorKey: 'status',
            cell: (row) => <StatusBadge status={row.status} />
        },
        {
            header: 'Tiến độ',
            accessorKey: 'progress',
            cell: (row) => (
                <div className="w-full max-w-[140px]">
                    <div className="flex justify-between text-xs mb-1">
                        <span>{row.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${row.progress || 0}%` }}></div>
                    </div>
                </div>
            )
        },
        {
            header: 'Ngày bắt đầu',
            accessorKey: 'startDate',
            cell: (row) => <span className="text-gray-600">{row.startDate ? new Date(row.startDate).toLocaleDateString('vi-VN') : '---'}</span>
        },
        {
            header: 'Thời hạn',
            accessorKey: 'endDate',
            cell: (row) => <span className="text-gray-600">{row.endDate ? new Date(row.endDate).toLocaleDateString('vi-VN') : '---'}</span>
        },
        {
            header: '',
            accessorKey: 'actions',
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => navigate(`/projects/${row.projectId}`)}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-all"
                    >
                        <i className="fa-solid fa-arrow-right" />
                    </button>
                </div>
            )
        }
    ];

    if (!projects?.length) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                    <i className="fa-solid fa-folder-open text-3xl text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Chưa có dự án nào</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Bắt đầu quản lý công việc bằng cách tạo dự án đầu tiên của bạn.
                </p>
            </div>
        );
    }

    return <DataTable columns={columns} data={projects || []} />;
}

function ProjectCardView({ projects, navigate }) {
    if (!projects?.length) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center mb-6">
                    <i className="fa-solid fa-rocket text-4xl text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Bắt đầu dự án đầu tiên!</h3>
                <p className="text-gray-500 mb-6 max-w-lg mx-auto">
                    Tạo dự án để quản lý công việc, theo dõi tiến độ và cộng tác với đội ngũ của bạn.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
                <div
                    key={project.projectId}
                    onClick={() => navigate(`/projects/${project.projectId}`)}
                    className="group bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/0 group-hover:bg-primary transition-all"></div>
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xl">
                            <i className="fa-solid fa-folder-open" />
                        </div>
                        <StatusBadge status={project.status} />
                    </div>

                    <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-primary transition-colors">{project.name}</h3>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4 h-10">{project.description}</p>

                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Tiến độ</span>
                                <span className="font-medium text-gray-700">{project.progress || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${project.progress || 0}%` }}></div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-50">
                            <div className="flex items-center gap-1">
                                <i className="fa-regular fa-calendar" />
                                {project.startDate ? new Date(project.startDate).toLocaleDateString('vi-VN') : 'N/A'}
                            </div>
                            <div className="flex -space-x-2">
                                {project.members?.slice(0, 3).map((m, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] text-gray-600 font-bold" title={m.fullName}>
                                        {m.fullName?.charAt(0)}
                                    </div>
                                ))}
                                {(project.members?.length > 3) && (
                                    <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[9px] text-gray-500">+{project.members.length - 3}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function StatusBadge({ status }) {
    const configs = {
        PLANNING: { color: 'text-blue-700 bg-blue-50 border-blue-100', label: 'Planning' },
        IN_PROGRESS: { color: 'text-orange-700 bg-orange-50 border-orange-100', label: 'In Progress' },
        COMPLETED: { color: 'text-green-700 bg-green-50 border-green-100', label: 'Completed' },
        ON_HOLD: { color: 'text-gray-700 bg-gray-50 border-gray-100', label: 'On Hold' },
        CANCELLED: { color: 'text-red-700 bg-red-50 border-red-100', label: 'Cancelled' },
    };

    const config = configs[status] || configs.PLANNING;

    return (
        <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium border ${config.color}`}>
            {config.label}
        </span>
    );
}

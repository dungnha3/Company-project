import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import ProjectBoard from './tabs/ProjectBoard';
import ProjectGantt from './tabs/ProjectGantt';

export default function ProjectDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview'); // overview, board, list, gantt, settings

    const { data: project, isLoading } = useQuery({
        queryKey: ['project', id],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.BY_ID(id))).data,
    });

    if (isLoading) return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-3xl text-primary" /></div>;
    if (!project) return <div className="p-8 text-center text-red-500">Không tìm thấy dự án</div>;

    return (
        <div className="space-y-6">
            {/* Header with Breadcrumb and Actions */}
            <div className="flex flex-col gap-4">
                <button onClick={() => navigate('/projects')} className="text-gray-500 hover:text-gray-900 w-fit flex items-center gap-1">
                    <i className="fa-solid fa-arrow-left" /> Quay lại danh sách
                </button>

                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                        <p className="text-gray-500 mt-1 max-w-2xl">{project.description}</p>
                    </div>
                    <div className="flex gap-2">
                        {/* Example Actions */}
                        <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <i className="fa-solid fa-user-plus mr-2" /> Thành viên
                        </button>
                        <button className="btn-primary">
                            <i className="fa-solid fa-pen mr-2" /> Chỉnh sửa
                        </button>
                    </div>
                </div>

                {/* Meta Info Bar */}
                <div className="flex gap-6 text-sm text-gray-600 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2">
                        <i className="fa-regular fa-calendar text-primary" />
                        <span>Start: {project.startDate ? new Date(project.startDate).toLocaleDateString('vi-VN') : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-flag-checkered text-red-500" />
                        <span>End: {project.endDate ? new Date(project.endDate).toLocaleDateString('vi-VN') : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-chart-pie text-blue-500" />
                        <span>Status: {project.status}</span>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8" aria-label="Tabs">
                    {[
                        { id: 'overview', label: 'Tổng quan', icon: 'fa-chart-simple' },
                        { id: 'board', label: 'Bảng (Kanban)', icon: 'fa-columns' },
                        { id: 'list', label: 'Danh sách việc', icon: 'fa-list-check' },
                        { id: 'gantt', label: 'Gantt Chart', icon: 'fa-timeline' },
                        { id: 'settings', label: 'Cài đặt', icon: 'fa-gear' },
                    ].map((tab) => (
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
                {activeTab === 'list' && <div className="text-center py-10 text-gray-400">Issue List coming soon...</div>}
                {activeTab === 'gantt' && <ProjectGantt project={project} />}
                {activeTab === 'settings' && <div className="text-center py-10 text-gray-400">Project Settings coming soon...</div>}
            </div>
        </div>
    );
}

function OverviewTab({ project }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="card p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Hoạt động gần đây</h3>
                    <p className="text-gray-500 italic">Chưa có hoạt động nào.</p>
                </div>
            </div>
            <div className="space-y-6">
                <div className="card p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Thống kê</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Tiến độ dự án</span>
                                <span className="font-bold">{project.progress || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${project.progress || 0}%` }}></div>
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

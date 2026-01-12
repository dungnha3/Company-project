import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

export default function ProjectGantt({ project }) {
    // Fetch Sprints
    const { data: sprints = [] } = useQuery({
        queryKey: ['sprints', project.projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.SPRINTS.BY_PROJECT(project.projectId))).data,
    });

    // Fetch Phases
    const { data: phases = [] } = useQuery({
        queryKey: ['phases', project.projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PHASES.BY_PROJECT(project.projectId))).data || [],
    });

    // Combine items
    const ganttItems = [
        ...phases.map(p => ({ ...p, type: 'PHASE' })),
        ...sprints.map(s => ({ ...s, type: 'SPRINT' }))
    ].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // Calculate total duration in days to map to grid
    const startDate = new Date(project.startDate || new Date());
    const endDate = new Date(project.endDate || new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000));

    const totalDays = Math.max(1, (endDate - startDate) / (1000 * 60 * 60 * 24));

    const getPosition = (start, end) => {
        const s = start ? new Date(start) : startDate;
        const e = end ? new Date(end) : endDate;

        // Safety checks
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return { left: 0, width: 0 };

        const startDiff = (s - startDate) / (1000 * 60 * 60 * 24);
        const duration = (e - s) / (1000 * 60 * 60 * 24);

        return {
            left: `${Math.max(0, (startDiff / totalDays) * 100)}%`,
            width: `${Math.max(0.5, (duration / totalDays) * 100)}%`
        };
    };

    return (
        <div className="card p-6 h-full overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Tiến độ dự án (Gantt Chart)</h3>
                <div className="flex gap-2">
                    <button className="btn-secondary text-xs">
                        <i className="fa-solid fa-expand mr-1" /> Toàn màn hình
                    </button>
                </div>
            </div>

            {/* Timeline Header */}
            <div className="relative h-8 border-b border-gray-100 flex text-xs text-gray-400 mb-2">
                <span>{startDate.toLocaleDateString('vi-VN')}</span>
                <span className="absolute right-0">{endDate.toLocaleDateString('vi-VN')}</span>
                <div className="absolute left-1/2 -translate-x-1/2">Duration: {Math.round(totalDays)} days</div>
            </div>

            {/* Gantt Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 relative">
                {/* Vertical Grid Lines (Optional) */}
                <div className="absolute inset-0 flex justify-between pointer-events-none opacity-10">
                    {[...Array(5)].map((_, i) => <div key={i} className="w-px h-full bg-gray-400"></div>)}
                </div>

                {/* Project Overall Bar */}
                <div className="group">
                    <div className="flex items-center justify-between mb-1 text-sm font-semibold text-gray-700">
                        <span>{project.name}</span>
                        <span className="text-xs font-normal text-gray-500">PROJECT</span>
                    </div>
                    <div className="relative h-6 bg-gray-100 rounded-full w-full overflow-hidden">
                        <div className="absolute top-0 bottom-0 bg-blue-500 rounded-full group-hover:bg-blue-600 transition-colors shadow-sm" style={{ left: '0%', width: '100%' }}></div>
                    </div>
                </div>

                {/* Sprints / Phases */}
                {ganttItems.map((item, idx) => {
                    const pos = getPosition(item.startDate, item.endDate);
                    const isPhase = item.type === 'PHASE';
                    const isCompleted = item.status === 'COMPLETED';

                    return (
                        <div key={`${item.type}-${item.id || item.sprintId || idx}`} className="group">
                            <div className="flex items-center justify-between mb-1 text-sm text-gray-600 pl-4">
                                <span>{item.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1
                                    ${isPhase ? 'bg-purple-100 text-purple-700' : isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                                `}>
                                    {isPhase ? <i className="fa-solid fa-layer-group text-[9px]" /> : <i className="fa-solid fa-person-running text-[9px]" />}
                                    {isPhase ? 'PHASE' : item.status}
                                </span>
                            </div>
                            <div className="relative h-4 bg-gray-50 rounded-full w-full">
                                <div
                                    className={`absolute top-0 bottom-0 rounded-full transition-all shadow-sm cursor-pointer
                                       ${isPhase
                                            ? 'bg-purple-400 group-hover:bg-purple-500'
                                            : isCompleted ? 'bg-green-400 group-hover:bg-green-500' : 'bg-orange-400 group-hover:bg-orange-500'}
                                   `}
                                    style={{ left: pos.left, width: pos.width }}
                                    title={`${item.type}: ${item.name} \n${new Date(item.startDate).toLocaleDateString()} - ${new Date(item.endDate).toLocaleDateString()}`}
                                ></div>
                            </div>
                        </div>
                    );
                })}

                {ganttItems.length === 0 && (
                    <div className="text-center py-8 text-gray-400 italic text-sm">Chưa có Sprint hoặc Phase nào.</div>
                )}
            </div>
        </div>
    );
}

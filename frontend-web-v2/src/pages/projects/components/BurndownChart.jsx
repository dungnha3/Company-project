import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatDate } from '@shared/utils/formatters';

/**
 * Sprint Progress Overview — SIMPLIFIED
 * Hiển thị: tổng issues, đã xong, còn lại, tiến độ %, milestone dates
 * KHÔNG dùng burndown chart — quá khó hiểu với người thường
 */
export default function SprintOverview({ sprintId, sprintName }) {
    const { data: burndown, isLoading } = useQuery({
        queryKey: ['burndown', sprintId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECT_DASHBOARD.BURNDOWN(sprintId))).data,
        enabled: !!sprintId,
    });

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-center h-32">
                    <i className="fa-solid fa-spinner fa-spin text-2xl text-indigo-500" />
                </div>
            </div>
        );
    }

    if (!burndown) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="text-center py-8 text-gray-400">
                    <i className="fa-solid fa-chart-line text-3xl mb-2" />
                    <p>Chưa có dữ liệu sprint</p>
                </div>
            </div>
        );
    }

    const total = burndown.totalIssues || 0;
    const completed = burndown.burndownData?.length > 0
        ? burndown.burndownData[burndown.burndownData.length - 1].completedIssues
        : 0;
    const remaining = total - completed;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Sprint date range
    const firstDay = burndown.burndownData?.[0];
    const lastDay = burndown.burndownData?.[burndown.burndownData.length - 1];
    const sprintDays = burndown.burndownData?.length || 0;

    // Status color
    let status, statusEmoji, statusBg;
    if (pct >= 80) { status = 'Sắp xong!'; statusEmoji = '🚀'; statusBg = 'bg-green-50 border-green-200 text-green-700'; }
    else if (pct >= 50) { status = 'Đang làm tốt'; statusEmoji = '💪'; statusBg = 'bg-blue-50 border-blue-200 text-blue-700'; }
    else if (pct > 0) { status = 'Cần đẩy nhanh'; statusEmoji = '⚡'; statusBg = 'bg-amber-50 border-amber-200 text-amber-700'; }
    else { status = 'Chưa bắt đầu'; statusEmoji = '⏳'; statusBg = 'bg-gray-50 border-gray-200 text-gray-600'; }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="font-bold text-gray-900">{sprintName || 'Sprint'}</h3>
                    <p className="text-sm text-gray-500">
                        {firstDay ? `${formatDate(firstDay.date)} → ${formatDate(lastDay?.date)}` : 'Chưa có ngày'}
                        {sprintDays > 0 && <span className="ml-2">({sprintDays} ngày)</span>}
                    </p>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusBg}`}>
                    <span>{statusEmoji}</span>
                    <span>{status}</span>
                </div>
            </div>

            {/* Stats 3 ô */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-3xl font-black text-indigo-600">{total}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Tổng issues</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
                    <div className="text-3xl font-black text-green-600">{completed}</div>
                    <div className="text-[11px] text-green-600 mt-0.5">Đã xong</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-xl border border-orange-100">
                    <div className="text-3xl font-black text-orange-500">{remaining}</div>
                    <div className="text-[11px] text-orange-500 mt-0.5">Còn lại</div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Tiến độ sprint</span>
                    <span className="font-bold text-indigo-600">{pct}%</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${
                            pct >= 80 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                            pct >= 50 ? 'bg-gradient-to-r from-indigo-400 to-purple-500' :
                            pct > 0   ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                                        'bg-gray-300'
                        }`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>

            {/* Milestone markers */}
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>Bắt đầu</span>
                <span>50%</span>
                <span>100%</span>
            </div>

            {/* Daily log summary */}
            {burndown.burndownData && burndown.burndownData.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Nhật ký hoàn thành</p>
                    <div className="flex gap-1 items-end h-12">
                        {burndown.burndownData.slice(-14).map((day, i) => {
                            const h = total > 0 ? (day.completedIssues / total) * 100 : 0;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${formatDate(day.date)}: +${day.completedIssues} hoàn thành`}>
                                    <span className="text-[8px] text-gray-400">{day.completedIssues}</span>
                                    <div
                                        className="w-full rounded-sm bg-indigo-400 min-h-[2px]"
                                        style={{ height: `${Math.max(h, 2)}%` }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-[9px] text-gray-400 text-center mt-1">14 ngày gần nhất</p>
                </div>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { toast } from 'sonner';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function ProjectPerformancePage() {
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [proposal, setProposal] = useState({ proposedSalary: '', reason: '' });

    const { data: myProjects = [] } = useQuery({
        queryKey: ['performance-page-projects'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.LIST);
            return Array.isArray(res.data) ? res.data : (res.data?.content || []);
        },
    });

    useEffect(() => {
        if (!selectedProjectId && myProjects.length > 0) {
            setSelectedProjectId(myProjects[0].projectId || myProjects[0].id);
        }
    }, [myProjects, selectedProjectId]);

    const displayProjectId = selectedProjectId || (myProjects[0]?.projectId || myProjects[0]?.id);

    const { data: rankings = [], isLoading } = useQuery({
        queryKey: ['performance-rankings', displayProjectId],
        queryFn: async () => {
            if (!displayProjectId) return [];
            const res = await apiClient.get(ENDPOINTS.PERFORMANCE.COMPARISON_BY_PROJECT(displayProjectId));
            return res.data || [];
        },
        enabled: !!displayProjectId,
    });

    const proposalMutation = useMutation({
        mutationFn: async (data) => {
            await apiClient.post(ENDPOINTS.HR_PROPOSALS, { ...data, projectId: displayProjectId });
        },
        onSuccess: () => {
            toast.success('Đã gửi đề xuất tăng lương thành công!');
            setSelectedEmployee(null);
            setProposal({ proposedSalary: '', reason: '' });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
        }
    });

    const safeNumber = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    };
    const toOne = (value) => safeNumber(value).toFixed(1);

    // Filter active rankings (members with at least 1 completed task)
    const activeRankings = rankings.filter(r => safeNumber(r.completedTasks) > 0);

    // Prepare data for charts
    const top3 = activeRankings.slice(0, 3);
    const avgScore = activeRankings.reduce((sum, r) => sum + safeNumber(r.totalPerformanceScore), 0) / Math.max(activeRankings.length, 1);
    const avgSpeed = activeRankings.reduce((sum, r) => sum + safeNumber(r.speedScore), 0) / Math.max(activeRankings.length, 1);
    const totalLate = rankings.reduce((sum, r) => sum + safeNumber(r.lateTasks), 0);
    const totalOverdue = rankings.reduce((sum, r) => sum + safeNumber(r.overdueTasks), 0);
    const totalRework = rankings.reduce((sum, r) => sum + safeNumber(r.reworks), 0);
    const totalCompleted = rankings.reduce((sum, r) => sum + safeNumber(r.completedTasks), 0);
    const totalStoryPoints = rankings.reduce((sum, r) => sum + safeNumber(r.totalStoryPoints), 0);
    
    // Radar Data
    const radarData = [
        { metric: 'Khối lượng', fullMark: 10 },
        { metric: 'Tốc độ', fullMark: 10 },
        { metric: 'Chất lượng', fullMark: 10 }
    ];
    top3.forEach((emp, index) => {
        radarData[0][`emp${index}`] = safeNumber(emp.volumeScore);
        radarData[1][`emp${index}`] = safeNumber(emp.speedScore);
        radarData[2][`emp${index}`] = safeNumber(emp.qualityScore);
    });

    // Bar Data for active members
    const barData = activeRankings.map(emp => ({
        name: emp.employeeName,
        'Khối lượng': safeNumber(emp.volumeScore),
        'Tốc độ': safeNumber(emp.speedScore),
        'Chất lượng': safeNumber(emp.qualityScore),
        'Tổng điểm': safeNumber(emp.totalPerformanceScore)
    }));

    const COLORS = ['#8884d8', '#82ca9d', '#ffc658'];

    const handlePropose = (e) => {
        e.preventDefault();
        proposalMutation.mutate({
            employeeId: selectedEmployee.employeeId,
            proposedSalary: parseFloat(proposal.proposedSalary),
            reason: proposal.reason
        });
    };

    return (
        <div className="max-w-full mx-auto p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-100 px-6 py-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-chart-line text-indigo-500 text-xl" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Hiệu suất dự án</h1>
                        <p className="text-sm text-gray-500 mt-0.5">So sánh và đánh giá hiệu suất của nhân sự trong dự án</p>
                    </div>
                </div>
                <select
                    value={displayProjectId || ''}
                    onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full sm:w-64 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                    <option value="">— Chọn dự án —</option>
                    {myProjects.map(p => (
                        <option key={p.projectId || p.id} value={p.projectId || p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            {!displayProjectId ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                    <i className="fa-solid fa-chart-line text-4xl text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Chưa chọn dự án</h3>
                    <p className="text-gray-500 text-sm">Vui lòng chọn một dự án để xem hiệu suất.</p>
                </div>
            ) : isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-400" />
                </div>
            ) : activeRankings.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                    <i className="fa-solid fa-users-slash text-4xl text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">Chưa có dữ liệu hiệu suất cho dự án này.</p>
                </div>
            ) : (
                <>
                    {/* KPI Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                        <MetricCard title="Điểm TB" value={toOne(avgScore)} tone="indigo" />
                        <MetricCard title="Tốc độ TB" value={toOne(avgSpeed)} tone="teal" />
                        <MetricCard title="Task hoàn thành" value={String(totalCompleted)} tone="green" />
                        <MetricCard title="Story points" value={String(totalStoryPoints)} tone="purple" />
                        <MetricCard title="Trễ hạn" value={String(totalLate)} tone="red" />
                        <MetricCard title="Quá hạn đang mở" value={String(totalOverdue)} tone="orange" />
                        <MetricCard title="Bị trả lại" value={String(totalRework)} tone="amber" />
                        <MetricCard title="Nhân sự" value={String(rankings.length)} tone="slate" />
                    </div>

                    <div className="bg-white rounded-xl border border-indigo-100 p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-indigo-900 border-b border-indigo-50 pb-2">
                            <i className="fa-solid fa-circle-info text-indigo-500 text-lg" />
                            <h3 className="font-bold text-gray-900">Công thức tính điểm hiệu suất</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-50">
                                <p className="font-semibold text-indigo-950 mb-1 text-xs uppercase tracking-wide">1. Hiệu suất hệ thống</p>
                                <div className="bg-white px-2 py-1 rounded border border-indigo-100 font-mono text-[11px] text-indigo-700 inline-block mb-2">
                                    (Khối lượng + Tốc độ) / 2
                                </div>
                                <ul className="list-disc pl-4 space-y-1 text-xs text-gray-500">
                                    <li><strong>Khối lượng:</strong> Tổng hợp thời gian log, trọng số task, độ khó và độ ưu tiên.</li>
                                    <li><strong>Tốc độ:</strong> Tỷ lệ hoàn thành công việc so với thời hạn dự kiến.</li>
                                </ul>
                            </div>
                            <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-50">
                                <p className="font-semibold text-purple-950 mb-1 text-xs uppercase tracking-wide">2. Tổng điểm hiệu suất</p>
                                <div className="bg-white px-2 py-1 rounded border border-purple-100 font-mono text-[11px] text-purple-700 inline-block mb-2">
                                    (Hiệu suất hệ thống + Chất lượng) / 2
                                </div>
                                <ul className="list-disc pl-4 space-y-1 text-xs text-gray-500">
                                    <li>Là căn cứ tổng hợp chính để xếp hạng và thưởng phạt nhân sự.</li>
                                    <li><strong>Chất lượng:</strong> Điểm đánh giá (Review) được HR/PM duyệt.</li>
                                </ul>
                            </div>
                            <div className="bg-rose-50/50 rounded-lg p-3 border border-rose-50">
                                <p className="font-semibold text-rose-950 mb-1 text-xs uppercase tracking-wide">3. Yếu tố giảm trừ</p>
                                <div className="bg-white px-2 py-1 rounded border border-rose-100 text-rose-700 font-semibold text-[11px] inline-block mb-2">
                                    Trễ hạn & Bị trả lại (Rework)
                                </div>
                                <ul className="list-disc pl-4 space-y-1 text-xs text-gray-500">
                                    <li><strong>Trễ hạn:</strong> Task hoàn thành muộn sẽ bị giảm trừ điểm Tốc độ.</li>
                                    <li><strong>Rework:</strong> Mỗi lần task bị từ chối/bị trả lại sẽ bị trừ điểm Khối lượng.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Radar Chart for Top 3 */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-1">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">So sánh Top 3</h3>
                            <p className="text-xs text-gray-500 mb-4">Ba trục chính: Khối lượng - Tốc độ - Chất lượng</p>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="metric" />
                                        <PolarRadiusAxis angle={30} domain={[0, 10]} />
                                        {top3.map((emp, index) => (
                                            <Radar
                                                key={emp.employeeId}
                                                name={emp.employeeName}
                                                dataKey={`emp${index}`}
                                                stroke={COLORS[index]}
                                                fill={COLORS[index]}
                                                fillOpacity={0.4}
                                            />
                                        ))}
                                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Bar Chart for Overall Score */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Hiệu suất toàn đội</h3>
                            <p className="text-xs text-gray-500 mb-4">Mỗi cột gồm Khối lượng + Tốc độ + Chất lượng (thang 10)</p>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={11} tick={{fill: '#666'}} />
                                        <YAxis domain={[0, 10]} fontSize={11} />
                                        <Tooltip cursor={{fill: '#f3f4f6'}} />
                                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                        <Bar dataKey="Khối lượng" stackId="a" fill="#6366f1" radius={[0,0,4,4]} />
                                        <Bar dataKey="Tốc độ" stackId="a" fill="#14b8a6" />
                                        <Bar dataKey="Chất lượng" stackId="a" fill="#f59e0b" radius={[4,4,0,0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Bảng xếp hạng chi tiết</h3>
                                <p className="text-sm text-gray-500">Tách rõ nhóm chỉ số hiệu suất và nhóm chỉ số thời gian</p>
                            </div>
                            <i className="fa-solid fa-trophy text-4xl text-yellow-400 opacity-20" />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
                                        <th className="p-4 font-semibold text-center w-16">Hạng</th>
                                        <th className="p-4 font-semibold">Nhân viên</th>
                                        <th className="p-4 font-semibold text-center" title="Khối lượng (Giờ * Ưu tiên * Độ khó * Thưởng/Phạt Deadline * Phạt Rework)">Khối lượng <i className="fa-solid fa-circle-info text-xs text-gray-400" /></th>
                                        <th className="p-4 font-semibold text-center">Tốc độ</th>
                                        <th className="p-4 font-semibold text-center" title="Số task hoàn thành trễ hạn">Trễ hạn</th>
                                        <th className="p-4 font-semibold text-center" title="Số task đã quá hạn nhưng chưa hoàn thành">Quá hạn</th>
                                        <th className="p-4 font-semibold text-center" title="Số lần task bị trả lại (Rework)">Bị trả lại</th>
                                        <th className="p-4 font-semibold text-center">Chất lượng</th>
                                        <th className="p-4 font-semibold text-center">Tổng điểm</th>
                                        <th className="p-4 font-semibold text-right">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {activeRankings.map((emp, index) => (
                                        <tr key={emp.employeeId} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="p-4 text-center">
                                                {index === 0 ? <i className="fa-solid fa-medal text-yellow-500 text-2xl drop-shadow" /> : 
                                                 index === 1 ? <i className="fa-solid fa-medal text-gray-400 text-xl" /> : 
                                                 index === 2 ? <i className="fa-solid fa-medal text-amber-600 text-xl" /> : 
                                                 <span className="font-bold text-gray-400">#{index + 1}</span>}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={emp.employeeAvatar || 'https://ui-avatars.com/api/?name='+emp.employeeName} className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200" alt="avatar" />
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{emp.employeeName}</p>
                                                        <p className="text-xs text-gray-500">{emp.completedTasks} tasks / {emp.totalStoryPoints} points</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center font-medium text-indigo-600">{toOne(emp.volumeScore)}</td>
                                            <td className="p-4 text-center font-medium text-teal-600">{toOne(emp.speedScore)}</td>
                                            <td className="p-4 text-center font-medium text-red-500">{safeNumber(emp.lateTasks) > 0 ? safeNumber(emp.lateTasks) : '-'}</td>
                                            <td className="p-4 text-center font-medium text-rose-500">{safeNumber(emp.overdueTasks) > 0 ? safeNumber(emp.overdueTasks) : '-'}</td>
                                            <td className="p-4 text-center font-medium text-orange-500">{safeNumber(emp.reworks) > 0 ? safeNumber(emp.reworks) : '-'}</td>
                                            <td className="p-4 text-center font-medium text-amber-600">
                                                {emp.qualityScore != null ? toOne(emp.qualityScore) : '—'}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 font-bold text-indigo-700">
                                                    {toOne(emp.totalPerformanceScore)}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    onClick={() => setSelectedEmployee(emp)}
                                                    className="px-3 py-1.5 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg text-sm font-semibold transition-colors"
                                                >
                                                    <i className="fa-solid fa-arrow-trend-up mr-1" /> Đề xuất lương
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Salary Proposal Modal */}
            {selectedEmployee && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">Đề xuất tăng lương</h3>
                            <button onClick={() => setSelectedEmployee(null)} className="text-gray-400 hover:text-gray-600">
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                        <form onSubmit={handlePropose} className="p-6 space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-800">
                                <i className="fa-solid fa-user-check text-xl" />
                                <div>
                                    <p className="text-sm font-medium">Nhân sự: {selectedEmployee.employeeName}</p>
                                    <p className="text-xs opacity-80">Hạng: #{rankings.findIndex(r => r.employeeId === selectedEmployee.employeeId) + 1} - Điểm: {toOne(selectedEmployee.totalPerformanceScore)}</p>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mức lương đề xuất mới (VND)</label>
                                <input
                                    type="number"
                                    required
                                    value={proposal.proposedSalary}
                                    onChange={(e) => setProposal({ ...proposal, proposedSalary: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                    placeholder="Ví dụ: 15000000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Lý do / Căn cứ</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={proposal.reason}
                                    onChange={(e) => setProposal({ ...proposal, reason: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                    placeholder="Điểm hiệu suất cao, cống hiến vượt bậc..."
                                />
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                                <button type="button" onClick={() => setSelectedEmployee(null)} className="btn-secondary">
                                    Hủy
                                </button>
                                <button type="submit" disabled={proposalMutation.isPending} className="btn-primary bg-yellow-500 hover:bg-yellow-600 border-none text-white">
                                    <i className="fa-solid fa-paper-plane mr-2" />
                                    {proposalMutation.isPending ? 'Đang gửi...' : 'Gửi đề xuất lên Sếp'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ title, value, tone = 'slate' }) {
    const styles = {
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        teal: 'bg-teal-50 text-teal-700 border-teal-100',
        green: 'bg-green-50 text-green-700 border-green-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
        red: 'bg-red-50 text-red-700 border-red-100',
        orange: 'bg-orange-50 text-orange-700 border-orange-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        slate: 'bg-slate-50 text-slate-700 border-slate-100',
    };

    return (
        <div className={`rounded-xl border px-3 py-2 ${styles[tone] || styles.slate}`}>
            <p className="text-[11px] uppercase tracking-wide opacity-80">{title}</p>
            <p className="text-lg font-bold leading-tight">{value}</p>
        </div>
    );
}

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { toast } from 'sonner';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function ProjectPerformanceTab({ projectId }) {
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [proposal, setProposal] = useState({ proposedSalary: '', reason: '' });

    const { data: rankings, isLoading } = useQuery({
        queryKey: ['performance-rankings', projectId],
        queryFn: async () => {
            const res = await apiClient.get(`/api/hr/performance-comparison/projects/${projectId}`);
            return res.data;
        }
    });

    const proposalMutation = useMutation({
        mutationFn: async (data) => {
            await apiClient.post('/api/hr/proposals', { ...data, projectId });
        },
        onSuccess: () => {
            toast.success('Đã gửi đề xuất tăng lương thành công!');
            setSelectedEmployee(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
        }
    });

    if (isLoading) return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-3xl text-primary" /></div>;
    if (!rankings || rankings.length === 0) return <div className="p-8 text-center text-gray-500">Chưa có dữ liệu hiệu suất cho dự án này.</div>;

    const safeNumber = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    };
    const toOne = (value) => safeNumber(value).toFixed(1);

    // Prepare data for charts
    const top3 = rankings.slice(0, 3);
    const avgScore = rankings.reduce((sum, r) => sum + safeNumber(r.totalPerformanceScore), 0) / Math.max(rankings.length, 1);
    const avgSpeed = rankings.reduce((sum, r) => sum + safeNumber(r.speedScore), 0) / Math.max(rankings.length, 1);
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

    // Bar Data for everyone
    const barData = rankings.map(emp => ({
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
        <div className="space-y-6 animate-fade-in">
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

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-900">
                <p className="font-semibold mb-1">Giải thích nhanh điểm số</p>
                <p>- Hiệu suất hệ thống: trung bình giữa <strong>Khối lượng</strong> và <strong>Tốc độ</strong>.</p>
                <p>- Tổng điểm: trung bình giữa <strong>Hiệu suất hệ thống</strong> và <strong>Chất lượng review</strong>.</p>
                <p>- Trễ hạn/Rework ảnh hưởng trực tiếp đến điểm khối lượng và tổng điểm.</p>
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
                            {rankings.map((emp, index) => (
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
                                    <td className="p-4 text-center font-medium text-amber-600">{toOne(emp.qualityScore)}</td>
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

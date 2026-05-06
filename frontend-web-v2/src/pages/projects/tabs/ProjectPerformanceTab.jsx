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

    // Prepare data for charts
    const top3 = rankings.slice(0, 3);
    
    // Radar Data
    const radarData = [
        { metric: 'Khối lượng', fullMark: 10 },
        { metric: 'Tốc độ', fullMark: 10 },
        { metric: 'Chất lượng', fullMark: 10 }
    ];
    top3.forEach((emp, index) => {
        radarData[0][`emp${index}`] = emp.volumeScore || 0;
        radarData[1][`emp${index}`] = emp.speedScore || 0;
        radarData[2][`emp${index}`] = emp.qualityScore || 0;
    });

    // Bar Data for everyone
    const barData = rankings.map(emp => ({
        name: emp.employeeName,
        'Khối lượng': emp.volumeScore || 0,
        'Tốc độ': emp.speedScore || 0,
        'Chất lượng': emp.qualityScore || 0,
        'Tổng điểm': emp.totalPerformanceScore || 0
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
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Radar Chart for Top 3 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">So sánh sức mạnh Top 3</h3>
                    <p className="text-xs text-gray-500 mb-4">Chỉ số Khối lượng, Tốc độ, Chất lượng</p>
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
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Điểm Hiệu suất Toàn Đội</h3>
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
                        <h3 className="text-lg font-bold text-gray-900">Bảng Xếp Hạng (Leaderboard)</h3>
                        <p className="text-sm text-gray-500">Dựa trên kết quả tự động & đánh giá PM</p>
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
                                    <td className="p-4 text-center font-medium text-indigo-600">{emp.volumeScore?.toFixed(1)}</td>
                                    <td className="p-4 text-center font-medium text-teal-600">{emp.speedScore?.toFixed(1)}</td>
                                    <td className="p-4 text-center font-medium text-red-500">{emp.lateTasks > 0 ? emp.lateTasks : '-'}</td>
                                    <td className="p-4 text-center font-medium text-orange-500">{emp.reworks > 0 ? emp.reworks : '-'}</td>
                                    <td className="p-4 text-center font-medium text-amber-600">{emp.qualityScore?.toFixed(1) || '-'}</td>
                                    <td className="p-4 text-center">
                                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 font-bold text-indigo-700">
                                            {emp.totalPerformanceScore?.toFixed(1)}
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
                                    <p className="text-xs opacity-80">Hạng: #{rankings.findIndex(r => r.employeeId === selectedEmployee.employeeId) + 1} - Điểm: {selectedEmployee.totalPerformanceScore?.toFixed(1)}</p>
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

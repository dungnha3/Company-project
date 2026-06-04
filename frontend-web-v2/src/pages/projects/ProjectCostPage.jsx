import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatCurrency, formatDate } from '@shared/utils/formatters';
import { useAccessControl } from '@shared/hooks/useAccessControl';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    ResponsiveContainer, CartesianGrid
} from '@shared/components/LazyCharts';
import { CHART_TOOLTIP_STYLE, tooltipCurrencyFormatter } from '@shared/components/chart/ChartUtils';

const CATEGORY_LABELS = {
    'SERVER': 'Máy chủ/Cloud',
    'SOFTWARE': 'Bản quyền PM',
    'HARDWARE': 'Thiết bị',
    'MARKETING': 'Marketing',
    'TRAVEL': 'Đi lại',
    'OTHER': 'Khác'
};
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'];

export default function ProjectCostPage() {
    const queryClient = useQueryClient();
    const { hasPermission } = useAccessControl();
    const canManageCost = hasPermission('PROJECT.MANAGE_ALL');

    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [pieActiveIndex, setPieActiveIndex] = useState(null);
    const [barSelectedMember, setBarSelectedMember] = useState(null);
    const navigate = useNavigate();
    const [newExpense, setNewExpense] = useState({
        expenseName: '', amount: '', expenseDate: new Date().toISOString().split('T')[0],
        description: '', category: 'OTHER'
    });

    const { data: myProjects = [] } = useQuery({
        queryKey: ['cost-page-projects'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.LIST);
            return Array.isArray(res.data) ? res.data : (res.data?.content || []);
        },
    });

    useEffect(() => {
        if (!selectedProjectId && myProjects.length > 0) {
            setSelectedProjectId(myProjects[0].projectId || myProjects[0].id);
        }
    }, [myProjects]);

    const { data: costData, isLoading } = useQuery({
        queryKey: ['project-costs', selectedProjectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECT_COSTS.BY_PROJECT(selectedProjectId));
            return res.data;
        },
        enabled: !!selectedProjectId,
    });

    const addExpenseMutation = useMutation({
        mutationFn: async (data) => {
            await apiClient.post(ENDPOINTS.PROJECT_COSTS.CREATE_EXPENSE, { ...data, projectId: selectedProjectId });
        },
        onSuccess: () => {
            setShowAddExpense(false);
            setNewExpense({ expenseName: '', amount: '', expenseDate: new Date().toISOString().split('T')[0], description: '', category: 'OTHER' });
            queryClient.invalidateQueries(['project-costs', selectedProjectId]);
        },
    });

    const handleAddExpense = (e) => {
        e.preventDefault();
        addExpenseMutation.mutate({
            expenseName: newExpense.expenseName,
            amount: parseFloat(newExpense.amount),
            expenseDate: newExpense.expenseDate,
            description: newExpense.description,
            category: newExpense.category
        });
    };

    const expenseCategories = (costData?.expenses || []).reduce((acc, curr) => {
        const cat = curr.category || 'OTHER';
        acc[cat] = (acc[cat] || 0) + curr.amount;
        return acc;
    }, {});

    const pieData = [
        { name: 'Chi phí Nhân sự', value: costData?.totalHrCost || 0 },
        ...Object.entries(expenseCategories).map(([cat, val]) => ({ name: CATEGORY_LABELS[cat] || cat, value: val }))
    ].filter(d => d.value > 0);

    const barData = (costData?.memberCosts || []).map(m => ({
        name: m.fullName,
        'Chi phí (VND)': m.totalCost || 0
    })).sort((a, b) => b['Chi phí (VND)'] - a['Chi phí (VND)']);

    const firstProject = myProjects[0]?.projectId || myProjects[0]?.id;
    const displayProjectId = selectedProjectId || firstProject;

    return (
        <div className="max-w-full mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-100 px-6 py-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-coins text-amber-500 text-xl" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Chi phí dự án</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Theo dõi chi phí nhân sự và chi phí phát sinh</p>
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
                    <i className="fa-solid fa-coins text-4xl text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Chưa chọn dự án</h3>
                    <p className="text-gray-500 text-sm">Vui lòng chọn một dự án để xem chi phí.</p>
                </div>
            ) : isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-400" />
                </div>
            ) : !costData ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                    <p className="text-red-500">Không thể tải dữ liệu chi phí.</p>
                </div>
            ) : (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <p className="text-gray-500 text-sm mb-1">Tổng Chi Phí Dự Án</p>
                            <p className="text-3xl font-bold text-gray-900">{formatCurrency(costData.totalProjectCost)}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <i className="fa-solid fa-users text-6xl text-indigo-500" />
                            </div>
                            <p className="text-indigo-600 text-sm font-semibold mb-1">Quỹ lương tiêu hao (HR)</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(costData.totalHrCost)}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <i className="fa-solid fa-cart-shopping text-6xl text-amber-500" />
                            </div>
                            <p className="text-amber-600 text-sm font-semibold mb-1">Chi phí phát sinh (Vật tư)</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(costData.totalExpenses)}</p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Phân bổ ngân sách</h3>
                            <div className="h-[300px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            activeIndex={pieActiveIndex}
                                            activeShape={{ outerRadius: 110, strokeWidth: 2, stroke: '#6366f1' }}
                                            onMouseEnter={(_, index) => setPieActiveIndex(index)}
                                            onMouseLeave={() => setPieActiveIndex(null)}
                                            onClick={(entry) => {
                                                const member = costData?.memberCosts?.find(m =>
                                                    (CATEGORY_LABELS[entry.name] === entry.name ? m.fullName : entry.name)
                                                );
                                                if (member) {
                                                    setBarSelectedMember(member.fullName);
                                                }
                                            }}
                                        >
                                            {pieData.map((_, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
                                                    opacity={pieActiveIndex !== null && pieActiveIndex !== index ? 0.5 : 1}
                                                    style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                                                />
                                            ))}
                                        </Pie>
                                        {pieActiveIndex !== null && pieData[pieActiveIndex] ? (
                                            <g>
                                                <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 20, fontWeight: 700, fill: '#111827' }}>
                                                    {tooltipCurrencyFormatter(pieData[pieActiveIndex].value)}
                                                </text>
                                            </g>
                                        ) : (
                                            <g>
                                                <text x="50%" y="42%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 10, fill: '#9CA3AF' }}>
                                                    Tổng
                                                </text>
                                                <text x="50%" y="55%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 12, fontWeight: 600, fill: '#6B7280' }}>
                                                    {formatCurrency(costData?.totalProjectCost || 0)}
                                                </text>
                                            </g>
                                        )}
                                        <Tooltip
                                            contentStyle={CHART_TOOLTIP_STYLE}
                                            formatter={(value) => [tooltipCurrencyFormatter(value), '']}
                                            labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                                        />
                                        <Legend
                                            formatter={(value) => (
                                                <span className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">{value}</span>
                                            )}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            {pieActiveIndex !== null && pieData[pieActiveIndex] && (
                                <p className="text-center text-xs text-gray-500 mt-2">
                                    Click một category để xem chi tiết chi phí
                                </p>
                            )}
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Chi phí nhân sự theo cá nhân</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={barData}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        onClick={(data) => {
                                            if (data && data.activeLabel) {
                                                setBarSelectedMember(data.activeLabel);
                                            }
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tickFormatter={(val) => `${val / 1000000}M`} />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={100}
                                            fontSize={12}
                                            tick={{ cursor: 'pointer' }}
                                        />
                                        <Tooltip
                                            contentStyle={CHART_TOOLTIP_STYLE}
                                            formatter={(value) => [tooltipCurrencyFormatter(value), 'Chi phí']}
                                            labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                                            cursor={{ fill: '#f3f4f6' }}
                                        />
                                        <Bar
                                            dataKey="Chi phí (VND)"
                                            fill="#6366f1"
                                            radius={[0, 4, 4, 0]}
                                            cursor="pointer"
                                            onClick={(data) => {
                                                if (data && data.name) {
                                                    setBarSelectedMember(data.name);
                                                }
                                            }}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            {barSelectedMember && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-500">Đã chọn</p>
                                            <p className="text-sm font-semibold text-gray-900">{barSelectedMember}</p>
                                        </div>
                                        <button
                                            onClick={() => setBarSelectedMember(null)}
                                            className="text-xs text-gray-400 hover:text-gray-600"
                                        >
                                            <i className="fa-solid fa-xmark" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Expenses List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">Danh sách Chi phí Phát sinh</h3>
                            {canManageCost && (
                                <button onClick={() => setShowAddExpense(true)} className="btn-primary">
                                    <i className="fa-solid fa-plus mr-2" /> Thêm chi phí
                                </button>
                            )}
                        </div>

                        {showAddExpense && (
                            <form onSubmit={handleAddExpense} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên khoản chi</label>
                                        <input type="text" required value={newExpense.expenseName}
                                            onChange={(e) => setNewExpense({ ...newExpense, expenseName: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                            placeholder="Ví dụ: Thuê máy chủ AWS" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                                        <select value={newExpense.category}
                                            onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary">
                                            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                                                <option key={val} value={val}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VND)</label>
                                        <input type="number" required value={newExpense.amount}
                                            onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                            placeholder="1000000" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày chi</label>
                                        <input type="date" required value={newExpense.expenseDate}
                                            onChange={(e) => setNewExpense({ ...newExpense, expenseDate: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                                        <input type="text" value={newExpense.description}
                                            onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                            placeholder="Ghi chú thêm..." />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setShowAddExpense(false)} className="btn-secondary">Hủy</button>
                                    <button type="submit" disabled={addExpenseMutation.isPending} className="btn-primary">
                                        {addExpenseMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="p-3 text-sm font-semibold text-gray-600">Ngày</th>
                                        <th className="p-3 text-sm font-semibold text-gray-600">Danh mục</th>
                                        <th className="p-3 text-sm font-semibold text-gray-600">Tên khoản chi</th>
                                        <th className="p-3 text-sm font-semibold text-gray-600">Ghi chú</th>
                                        <th className="p-3 text-sm font-semibold text-gray-600">Người tạo</th>
                                        <th className="p-3 text-sm font-semibold text-gray-600 text-right">Số tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {costData.expenses && costData.expenses.length > 0 ? (
                                        costData.expenses.map((expense) => (
                                            <tr key={expense.expenseId} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="p-3 text-sm text-gray-900">{formatDate(expense.expenseDate)}</td>
                                                <td className="p-3 text-sm text-gray-500">
                                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                                                        {CATEGORY_LABELS[expense.category] || expense.category || 'Khác'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-sm font-medium text-gray-900">{expense.expenseName}</td>
                                                <td className="p-3 text-sm text-gray-500">{expense.description || '-'}</td>
                                                <td className="p-3 text-sm text-gray-500">{expense.createdByName}</td>
                                                <td className="p-3 text-sm font-bold text-gray-900 text-right">{formatCurrency(expense.amount)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="p-6 text-center text-gray-500 italic">Chưa có chi phí phát sinh nào.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

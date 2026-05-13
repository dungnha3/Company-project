import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { formatCurrency, formatDate } from '@shared/utils/formatters';
import { useAccessControl } from '@shared/hooks/useAccessControl';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function ProjectCostTab({ projectId }) {
    const queryClient = useQueryClient();
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [newExpense, setNewExpense] = useState({
        expenseName: '',
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
        description: '',
        category: 'OTHER'
    });
    const { hasPermission } = useAccessControl();
    const canManageCost = hasPermission('PROJECT.MANAGE_ALL');

    const { data: costData, isLoading } = useQuery({
        queryKey: ['project-costs', projectId],
        queryFn: async () => {
            const res = await apiClient.get(`/api/projects/costs/${projectId}`);
            return res.data;
        }
    });

    const addExpenseMutation = useMutation({
        mutationFn: async (data) => {
            await apiClient.post('/api/projects/costs/expenses', { ...data, projectId });
        },
        onSuccess: () => {
            setShowAddExpense(false);
            setNewExpense({ expenseName: '', amount: '', expenseDate: new Date().toISOString().split('T')[0], description: '' });
            queryClient.invalidateQueries(['project-costs', projectId]);
        }
    });

    if (isLoading) return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-3xl text-primary" /></div>;
    if (!costData) return <div className="p-8 text-center text-red-500">Không thể tải dữ liệu chi phí</div>;

    const CATEGORY_LABELS = {
        'SERVER': 'Máy chủ/Cloud',
        'SOFTWARE': 'Bản quyền PM',
        'HARDWARE': 'Thiết bị',
        'MARKETING': 'Marketing',
        'TRAVEL': 'Đi lại',
        'OTHER': 'Khác'
    };

    const expenseCategories = (costData.expenses || []).reduce((acc, curr) => {
        const cat = curr.category || 'OTHER';
        acc[cat] = (acc[cat] || 0) + curr.amount;
        return acc;
    }, {});

    const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'];

    const pieData = [
        { name: 'Chi phí Nhân sự', value: costData.totalHrCost || 0 },
        ...Object.entries(expenseCategories).map(([cat, val]) => ({
            name: CATEGORY_LABELS[cat] || cat,
            value: val
        }))
    ].filter(d => d.value > 0);

    const barData = (costData.memberCosts || []).map(m => ({
        name: m.fullName,
        'Chi phí (VND)': m.totalCost || 0
    })).sort((a, b) => b['Chi phí (VND)'] - a['Chi phí (VND)']);

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

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Stats */}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Phân bổ ngân sách</h3>
                    <div className="h-[300px]">
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
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bar Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Chi phí nhân sự theo cá nhân</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" tickFormatter={(val) => `${val / 1000000}M`} />
                                <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Bar dataKey="Chi phí (VND)" fill="#6366f1" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Expenses List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800">Danh sách Chi phí Phát sinh</h3>
                    {canManageCost && (
                        <button
                            onClick={() => setShowAddExpense(true)}
                            className="btn-primary"
                        >
                            <i className="fa-solid fa-plus mr-2" /> Thêm chi phí
                        </button>
                    )}
                </div>

                {showAddExpense && (
                    <form onSubmit={handleAddExpense} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tên khoản chi</label>
                                <input
                                    type="text"
                                    required
                                    value={newExpense.expenseName}
                                    onChange={(e) => setNewExpense({ ...newExpense, expenseName: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                    placeholder="Ví dụ: Thuê máy chủ AWS"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                                <select
                                    value={newExpense.category}
                                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                >
                                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VND)</label>
                                <input
                                    type="number"
                                    required
                                    value={newExpense.amount}
                                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                    placeholder="1000000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày chi</label>
                                <input
                                    type="date"
                                    required
                                    value={newExpense.expenseDate}
                                    onChange={(e) => setNewExpense({ ...newExpense, expenseDate: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                                <input
                                    type="text"
                                    value={newExpense.description}
                                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                    placeholder="Ghi chú thêm..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowAddExpense(false)} className="btn-secondary">
                                Hủy
                            </button>
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
                                    <td colSpan="5" className="p-6 text-center text-gray-500 italic">Chưa có chi phí phát sinh nào.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

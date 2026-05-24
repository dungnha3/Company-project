import { useState, useEffect } from 'react';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

export default function AdminAnalyticsPage() {
    const [stats, setStats] = useState(null);
    const [growthData, setGrowthData] = useState([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const [statsRes, growthRes] = await Promise.all([
                apiClient.get(ENDPOINTS.SYSADMIN.ANALYTICS.STATS),
                apiClient.get(ENDPOINTS.SYSADMIN.ANALYTICS.GROWTH)
            ]);
            setStats(statsRes.data);
            setGrowthData(growthRes.data || []);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            toast.error('Không thể tải dữ liệu thống kê');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const statCards = [
        {
            label: 'Tổng Workspace',
            value: stats?.totalCompanies || 0,
            icon: 'fa-building',
            color: 'from-indigo-500 to-purple-600',
            bgColor: 'bg-indigo-100',
            iconColor: 'text-indigo-600'
        },
        {
            label: 'Workspace Hoạt động',
            value: stats?.activeCompanies || 0,
            icon: 'fa-check-circle',
            color: 'from-green-500 to-emerald-600',
            bgColor: 'bg-green-100',
            iconColor: 'text-green-600'
        },
        {
            label: 'Tổng Người dùng',
            value: stats?.totalUsers || 0,
            icon: 'fa-users',
            color: 'from-blue-500 to-cyan-600',
            bgColor: 'bg-blue-100',
            iconColor: 'text-blue-600'
        },
        {
            label: 'Tổng Dự án',
            value: stats?.totalProjects || 0,
            icon: 'fa-folder-open',
            color: 'from-amber-500 to-orange-600',
            bgColor: 'bg-amber-100',
            iconColor: 'text-amber-600'
        },
        {
            label: 'Doanh thu ước tính',
            value: `${(stats?.estimatedRevenue || 0).toLocaleString('vi-VN')}$`,
            icon: 'fa-dollar-sign',
            color: 'from-emerald-500 to-teal-600',
            bgColor: 'bg-emerald-100',
            iconColor: 'text-emerald-600',
            isCurrency: true
        }
    ];

    const maxGrowthValue = Math.max(
        ...growthData.map(d => Math.max(d.newCompanies || 0, d.newUsers || 0))
    );

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Thống kê hệ thống</h1>
                <p className="text-gray-500 mt-1">Tổng quan về hoạt động của nền tảng</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="loading-spinner" />
                </div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                        {statCards.map((card, index) => (
                            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                                        <p className={`text-2xl font-bold mt-2 ${card.isCurrency ? 'text-emerald-600' : 'text-gray-900'}`}>
                                            {card.isCurrency ? card.value : card.value.toLocaleString('vi-VN')}
                                        </p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                                        <i className={`fa-solid ${card.icon} text-xl ${card.iconColor}`} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Growth Chart */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Tăng trưởng 6 tháng gần nhất</h2>
                        
                        {growthData.length > 0 ? (
                            <div className="space-y-6">
                                {/* Companies Growth */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-indigo-500" />
                                            <span className="text-sm font-medium text-gray-700">Workspace mới</span>
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-2 h-32">
                                        {growthData.map((data, index) => (
                                            <div key={index} className="flex-1 flex flex-col items-center">
                                                <div 
                                                    className="w-full bg-gradient-to-t from-indigo-500 to-indigo-300 rounded-t-md transition-all duration-500"
                                                    style={{ 
                                                        height: `${maxGrowthValue > 0 ? ((data.newCompanies || 0) / maxGrowthValue) * 100 : 0}%`,
                                                        minHeight: data.newCompanies ? '8px' : '0'
                                                    }}
                                                />
                                                <span className="text-xs text-gray-500 mt-2">{data.month}</span>
                                                <span className="text-xs font-medium text-indigo-600">{data.newCompanies || 0}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Users Growth */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                                            <span className="text-sm font-medium text-gray-700">Người dùng mới</span>
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-2 h-32">
                                        {growthData.map((data, index) => (
                                            <div key={index} className="flex-1 flex flex-col items-center">
                                                <div 
                                                    className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-md transition-all duration-500"
                                                    style={{ 
                                                        height: `${maxGrowthValue > 0 ? ((data.newUsers || 0) / maxGrowthValue) * 100 : 0}%`,
                                                        minHeight: data.newUsers ? '8px' : '0'
                                                    }}
                                                />
                                                <span className="text-xs text-gray-500 mt-2">{data.month}</span>
                                                <span className="text-xs font-medium text-blue-600">{data.newUsers || 0}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <i className="fa-solid fa-chart-line text-4xl mb-4 text-gray-300" />
                                <p>Chưa có dữ liệu tăng trưởng</p>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => window.location.href = '/admin/companies'}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left hover:border-indigo-300 hover:shadow-md transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                                    <i className="fa-solid fa-building text-xl text-indigo-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">Quản lý Workspace</p>
                                    <p className="text-sm text-gray-500">Xem và quản lý các Workspace</p>
                                </div>
                            </div>
                        </button>
                        <button
                            onClick={() => window.location.href = '/admin/users'}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left hover:border-blue-300 hover:shadow-md transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                    <i className="fa-solid fa-users text-xl text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">Quản lý Users</p>
                                    <p className="text-sm text-gray-500">Xem và quản lý tài khoản</p>
                                </div>
                            </div>
                        </button>
                        <button
                            onClick={() => window.location.href = '/admin/settings'}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left hover:border-gray-300 hover:shadow-md transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                                    <i className="fa-solid fa-gear text-xl text-gray-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">Cấu hình Global</p>
                                    <p className="text-sm text-gray-500">Thiết lập hệ thống</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

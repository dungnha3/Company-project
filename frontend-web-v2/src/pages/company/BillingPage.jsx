import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

const PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        period: 'forever',
        features: ['5 thành viên', '3 dự án', '1GB lưu trữ', 'Chat cơ bản'],
        popular: false,
    },
    {
        id: 'starter',
        name: 'Starter',
        price: 199000,
        period: 'tháng',
        features: ['25 thành viên', '10 dự án', '10GB lưu trữ', 'Chat + File sharing', 'Báo cáo cơ bản'],
        popular: false,
    },
    {
        id: 'professional',
        name: 'Professional',
        price: 499000,
        period: 'tháng',
        features: ['Không giới hạn thành viên', 'Không giới hạn dự án', '100GB lưu trữ', 'Tất cả tính năng chat', 'Báo cáo nâng cao', 'API Access'],
        popular: true,
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: null,
        period: 'liên hệ',
        features: ['Mọi thứ của Pro', 'Lưu trữ không giới hạn', 'SSO / SAML', 'Hỗ trợ 24/7', 'SLA 99.9%', 'Tùy chỉnh riêng'],
        popular: false,
    },
];

export default function BillingPage() {
    const { currentWorkspace } = useWorkspaceStore();
    const toast = useToast();
    const [billingCycle, setBillingCycle] = useState('monthly'); // monthly | yearly

    // Mock billing data
    const { data: billing, isLoading } = useQuery({
        queryKey: ['company-billing', currentWorkspace?.id],
        queryFn: async () => ({
            currentPlan: 'professional',
            status: 'active',
            nextBillingDate: '2026-02-15',
            amount: 499000,
            paymentMethod: {
                type: 'card',
                last4: '4242',
                brand: 'Visa',
                expiry: '12/27',
            },
            invoices: [
                { id: 1, date: '2026-01-15', amount: 499000, status: 'paid' },
                { id: 2, date: '2025-12-15', amount: 499000, status: 'paid' },
                { id: 3, date: '2025-11-15', amount: 499000, status: 'paid' },
            ],
            usage: {
                members: { used: 24, limit: null },
                projects: { used: 12, limit: null },
                storage: { used: 25.6, limit: 100 },
            }
        }),
        enabled: !!currentWorkspace?.id,
    });

    const handleUpgrade = (planId) => {
        toast.info(`Đang chuyển đến trang thanh toán cho gói ${planId}...`);
        // Implement actual payment flow
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3" />
                <div className="h-48 bg-gray-200 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Thanh toán & Gói dịch vụ</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Quản lý subscription và xem lịch sử thanh toán
                </p>
            </div>

            {/* Current Plan Overview */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-blue-200 text-sm">Gói hiện tại</p>
                        <h2 className="text-3xl font-bold mt-1">
                            {PLANS.find(p => p.id === billing?.currentPlan)?.name || 'Free'}
                        </h2>
                        <p className="text-blue-200 text-sm mt-2">
                            Gia hạn: {new Date(billing?.nextBillingDate).toLocaleDateString('vi-VN')}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            {billing?.status === 'active' ? 'Đang hoạt động' : 'Hết hạn'}
                        </span>
                        <p className="text-2xl font-bold mt-3">
                            {billing?.amount?.toLocaleString('vi-VN')}đ
                            <span className="text-sm font-normal text-blue-200">/tháng</span>
                        </p>
                    </div>
                </div>

                {/* Usage Bars */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
                    <UsageBar
                        label="Thành viên"
                        used={billing?.usage.members.used}
                        limit={billing?.usage.members.limit}
                    />
                    <UsageBar
                        label="Dự án"
                        used={billing?.usage.projects.used}
                        limit={billing?.usage.projects.limit}
                    />
                    <UsageBar
                        label="Lưu trữ"
                        used={billing?.usage.storage.used}
                        limit={billing?.usage.storage.limit}
                        unit="GB"
                    />
                </div>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="flex justify-center">
                <div className="bg-gray-100 p-1 rounded-xl flex">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === 'monthly'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500'
                            }`}
                    >
                        Hàng tháng
                    </button>
                    <button
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === 'yearly'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500'
                            }`}
                    >
                        Hàng năm
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            -20%
                        </span>
                    </button>
                </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {PLANS.map(plan => (
                    <div
                        key={plan.id}
                        className={`
                            relative bg-white rounded-2xl border-2 p-6 transition-all
                            ${plan.popular ? 'border-blue-500 shadow-lg' : 'border-gray-100'}
                            ${billing?.currentPlan === plan.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                        `}
                    >
                        {plan.popular && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                                Phổ biến
                            </span>
                        )}
                        <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                        <div className="mt-4">
                            {plan.price !== null ? (
                                <>
                                    <span className="text-3xl font-bold text-gray-900">
                                        {(billingCycle === 'yearly' ? plan.price * 0.8 : plan.price).toLocaleString('vi-VN')}đ
                                    </span>
                                    <span className="text-sm text-gray-500">/{plan.period}</span>
                                </>
                            ) : (
                                <span className="text-2xl font-bold text-gray-900">Liên hệ</span>
                            )}
                        </div>
                        <ul className="mt-6 space-y-3">
                            {plan.features.map((feature, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                    <i className="fa-solid fa-check text-green-500" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => handleUpgrade(plan.id)}
                            disabled={billing?.currentPlan === plan.id}
                            className={`
                                w-full mt-6 py-2.5 rounded-xl font-medium text-sm transition-colors
                                ${billing?.currentPlan === plan.id
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : plan.popular
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }
                            `}
                        >
                            {billing?.currentPlan === plan.id ? 'Gói hiện tại' : 'Chọn gói này'}
                        </button>
                    </div>
                ))}
            </div>

            {/* Payment Method & Invoices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Method */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Phương thức thanh toán</h3>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-12 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded flex items-center justify-center text-white text-xs font-bold">
                            {billing?.paymentMethod.brand}
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-gray-900">
                                •••• •••• •••• {billing?.paymentMethod.last4}
                            </p>
                            <p className="text-xs text-gray-500">Hết hạn {billing?.paymentMethod.expiry}</p>
                        </div>
                        <button className="text-blue-600 text-sm hover:underline">
                            Thay đổi
                        </button>
                    </div>
                </div>

                {/* Recent Invoices */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800">Hóa đơn gần đây</h3>
                        <button className="text-blue-600 text-sm hover:underline">
                            Xem tất cả
                        </button>
                    </div>
                    <div className="space-y-3">
                        {billing?.invoices.map(invoice => (
                            <div key={invoice.id} className="flex items-center justify-between py-2">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {new Date(invoice.date).toLocaleDateString('vi-VN')}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {invoice.amount.toLocaleString('vi-VN')}đ
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                        Đã thanh toán
                                    </span>
                                    <button className="text-gray-400 hover:text-blue-600">
                                        <i className="fa-solid fa-download" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function UsageBar({ label, used, limit, unit = '' }) {
    const percentage = limit ? (used / limit) * 100 : null;

    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-blue-200">{label}</span>
                <span className="text-white font-medium">
                    {used}{unit} {limit ? `/ ${limit}${unit}` : '(∞)'}
                </span>
            </div>
            {percentage !== null ? (
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${percentage > 80 ? 'bg-red-400' : 'bg-white'}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
            ) : (
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full w-1/4" />
                </div>
            )}
        </div>
    );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useAuthStore } from '@shared/stores/authStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { formatNumber } from '@shared/utils/formatters';

const PLANS = [
    {
        id: 'FREE',
        name: 'Miễn Phí',
        price: 0,
        period: 'tháng',
        features: [
            'Tối đa 5 thành viên',
            'Tối đa 3 dự án',
            '1GB lưu trữ',
            'Chat, Projects, Storage',
        ],
        hrEnabled: false,
        aiEnabled: false,
        webhookEnabled: false,
        popular: false,
    },
    {
        id: 'STARTER',
        name: 'Starter',
        price: 99000,
        period: 'tháng',
        features: [
            'Tối đa 20 thành viên',
            '20 dự án',
            '10GB lưu trữ',
            'AI Assistant',
        ],
        hrEnabled: false,
        aiEnabled: true,
        webhookEnabled: false,
        popular: false,
    },
    {
        id: 'PROFESSIONAL',
        name: 'Professional',
        price: 199000,
        period: 'tháng',
        features: [
            'Tối đa 100 thành viên',
            '100 dự án',
            '100GB lưu trữ',
            'Đầy đủ HR Module',
            'AI + Webhooks',
        ],
        hrEnabled: true,
        aiEnabled: true,
        webhookEnabled: true,
        popular: true,
    },
    {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        price: null,
        period: 'Liên hệ',
        features: [
            'Mọi thứ của Pro',
            'Không giới hạn',
            'SSO / SAML / API',
            'Hỗ trợ 24/7',
            'Personal WS đi kèm',
        ],
        hrEnabled: true,
        aiEnabled: true,
        webhookEnabled: true,
        popular: false,
        includesPersonal: true,
    },
];

const BUNDLES = [
    {
        id: 'PRO_BUNDLE',
        name: 'Pro Bundle',
        description: 'Personal PRO + Company PRO',
        originalPrice: 398000,
        price: 299000,
        savings: '25%',
        popular: true,
    },
    {
        id: 'ENTERPRISE_BUNDLE',
        name: 'Enterprise Bundle',
        description: 'Toàn bộ không giới hạn',
        price: null,
        savings: null,
        popular: false,
    },
];

export default function BillingPage() {
    const { currentWorkspace, workspaceType } = useWorkspaceStore();
    const { user } = useAuthStore();
    const toast = useToast();
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [activeTab, setActiveTab] = useState(workspaceType === 'PERSONAL' ? 'personal' : 'company');

    const isPersonalWorkspace = workspaceType === 'PERSONAL';

    // Fetch billing data
    const { data: billing, isLoading } = useQuery({
        queryKey: ['billing', activeTab, currentWorkspace?.id],
        queryFn: async () => {
            // Use real company data from workspace
            const plan = activeTab === 'personal' ? (user?.personalPlan || 'FREE') : (currentWorkspace?.plan || 'FREE');
            return {
                currentPlan: plan,
                status: 'active',
                nextBillingDate: null,
                usage: {
                    members: { used: currentWorkspace?.memberCount || 0, limit: currentWorkspace?.memberLimit || 5 },
                    projects: { used: currentWorkspace?.projectCount || 0, limit: currentWorkspace?.projectLimit || 3 },
                    storage: { used: currentWorkspace?.storageUsedGB || 0, limit: currentWorkspace?.storageLimitGB || 1 },
                },
            };
        },
    });

    const handleUpgrade = async (planId) => {
        if (planId === 'ENTERPRISE') {
            toast.info('Gói Enterprise yêu cầu tư vấn riêng. Vui lòng liên hệ support@saas-enterprise.vn để được hỗ trợ.');
            return;
        }
        try {
            await apiClient.put(ENDPOINTS.SYSADMIN.COMPANY_PLAN(currentWorkspace?.id) + `?plan=${planId}`);
            toast.success(`Đã chuyển sang gói ${planId} thành công!`);
            queryClient.invalidateQueries(['billing-info']);
        } catch (error) {
            if (error.response?.status === 403) {
                toast.warning('Bạn không có quyền thay đổi gói dịch vụ. Vui lòng liên hệ quản trị viên hệ thống.');
            } else {
                toast.error(error.response?.data?.message || 'Không thể thay đổi gói dịch vụ. Vui lòng thử lại sau.');
            }
        }
    };

    const handleBundlePurchase = (bundleId) => {
        toast.info('Vui lòng liên hệ support@saas-enterprise.vn để mua gói Bundle.');
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
                    Quản lý subscription cho Personal và Company workspaces
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('personal')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'personal'
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <i className="fa-solid fa-user text-xs" />
                    Personal
                </button>
                {!isPersonalWorkspace && (
                    <button
                        onClick={() => setActiveTab('company')}
                        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'company'
                            ? 'bg-white shadow-sm text-gray-900'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <i className="fa-solid fa-building text-xs" />
                        {currentWorkspace?.name || 'Company'}
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('bundle')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'bundle'
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <i className="fa-solid fa-gift text-xs" />
                    Bundle
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">SALE</span>
                </button>
            </div>

            {/* Current Plan Overview */}
            {activeTab !== 'bundle' && (
                <div className={`rounded-2xl p-6 text-white ${activeTab === 'personal'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                    : 'bg-gradient-to-r from-indigo-600 to-indigo-600'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/70 text-sm flex items-center gap-2">
                                <i className={`fa-solid ${activeTab === 'personal' ? 'fa-user' : 'fa-building'}`} />
                                {activeTab === 'personal' ? 'Personal Workspace' : currentWorkspace?.name}
                            </p>
                            <h2 className="text-3xl font-bold mt-1">
                                {PLANS.find(p => p.id === billing?.currentPlan?.toUpperCase())?.name || 'Free'}
                            </h2>
                            <span className={`inline-flex items-center gap-2 px-3 py-1 mt-2 rounded-full text-sm ${billing?.status === 'active' ? 'bg-white/20' : 'bg-red-500/30'
                                }`}>
                                <span className={`w-2 h-2 rounded-full ${billing?.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                                {billing?.status === 'active' ? 'Đang hoạt động' : 'Hết hạn'}
                            </span>
                        </div>
                        {billing?.currentPlan?.toUpperCase() === 'ENTERPRISE' && (
                            <div className="text-right">
                                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                                    ✨ Bao gồm Personal Workspace
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Bundle Tab Content */}
            {activeTab === 'bundle' && (
                <div className="space-y-6">
                    <div className="text-center py-6">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 rounded-full font-medium">
                            <i className="fa-solid fa-fire" />
                            Tiết kiệm đến 25% khi mua Bundle!
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {BUNDLES.map(bundle => (
                            <div
                                key={bundle.id}
                                className={`relative bg-white rounded-2xl border-2 p-6 ${bundle.popular ? 'border-amber-400 shadow-lg' : 'border-gray-100'
                                    }`}
                            >
                                {bundle.popular && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full">
                                        Bán chạy
                                    </span>
                                )}
                                <h3 className="text-xl font-bold text-gray-900">{bundle.name}</h3>
                                <p className="text-gray-500 text-sm mt-1">{bundle.description}</p>
                                <div className="mt-4">
                                    {bundle.price !== null ? (
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-sm text-gray-400 line-through">
                                                {formatNumber(bundle.originalPrice)}đ
                                            </span>
                                            <span className="text-3xl font-bold text-gray-900">
                                                {formatNumber(bundle.price)}đ
                                            </span>
                                            <span className="text-sm text-gray-500">/tháng</span>
                                        </div>
                                    ) : (
                                        <span className="text-2xl font-bold text-gray-900">Liên hệ</span>
                                    )}
                                    {bundle.savings && (
                                        <span className="inline-flex px-2 py-1 mt-2 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                            Tiết kiệm {bundle.savings}
                                        </span>
                                    )}
                                </div>
                                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                                    <li className="flex items-center gap-2">
                                        <i className="fa-solid fa-check text-green-500" />
                                        Personal Workspace đầy đủ tính năng
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <i className="fa-solid fa-check text-green-500" />
                                        Company Workspace đầy đủ tính năng
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <i className="fa-solid fa-check text-green-500" />
                                        Thanh toán một lần, sử dụng cả hai
                                    </li>
                                </ul>
                                <button
                                    onClick={() => handleBundlePurchase(bundle.id)}
                                    className={`w-full mt-6 py-3 rounded-xl font-medium transition-colors ${bundle.popular
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                        }`}
                                >
                                    Chọn Bundle này
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Plans Grid */}
            {activeTab !== 'bundle' && (
                <>
                    {/* Billing Cycle Toggle */}
                    <div className="flex justify-center">
                        <div className="bg-gray-100 p-1 rounded-xl flex">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                                    }`}
                            >
                                Hàng tháng
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                                    }`}
                            >
                                Hàng năm
                                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                    -20%
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Plans */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {PLANS.map(plan => {
                            const isCurrent = billing?.currentPlan?.toUpperCase() === plan.id;
                            const displayPrice = billingCycle === 'yearly' && plan.price
                                ? Math.round(plan.price * 0.8)
                                : plan.price;

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative bg-white rounded-2xl border-2 p-6 transition-all ${plan.popular ? 'border-indigo-500 shadow-lg' : 'border-gray-100'
                                        } ${isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                                >
                                    {plan.popular && (
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-500 text-white text-xs font-bold rounded-full">
                                            Phổ biến
                                        </span>
                                    )}
                                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                                    <div className="mt-4">
                                        {displayPrice !== null ? (
                                            <>
                                                <span className="text-3xl font-bold text-gray-900">
                                                    {formatNumber(displayPrice)}đ
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
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {plan.hrEnabled && (
                                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                                                👥 HR
                                            </span>
                                        )}
                                        {plan.aiEnabled && (
                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                                🤖 AI
                                            </span>
                                        )}
                                        {plan.webhookEnabled && (
                                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                                                🔗 Webhook
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleUpgrade(plan.id)}
                                        disabled={isCurrent}
                                        className={`w-full mt-6 py-2.5 rounded-xl font-medium text-sm transition-colors ${isCurrent
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : plan.popular
                                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                            }`}
                                    >
                                        {isCurrent ? 'Gói hiện tại' : 'Chọn gói này'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

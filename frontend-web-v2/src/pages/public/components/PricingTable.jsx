import React from 'react';
import { Link } from 'react-router-dom';

const plans = [
    {
        name: 'FREE',
        price: '0',
        currency: 'VNĐ',
        period: '/tháng',
        description: 'Dành cho Startup và nhóm nhỏ',
        features: [
            'Tối đa 5 thành viên',
            '3 Dự án đang hoạt động',
            '1 GB dung lượng lưu trữ',
            'Chat, Projects, Storage'
        ],
        cta: 'Dùng miễn phí',
        ctaLink: '/register',
        recommended: false,
        color: 'bg-gray-50 border-gray-200'
    },
    {
        name: 'STARTER',
        price: '99.000',
        currency: 'VNĐ',
        period: '/tháng',
        description: 'Cho team đang phát triển',
        features: [
            'Tối đa 20 thành viên',
            '20 Dự án đang hoạt động',
            '10 GB dung lượng lưu trữ',
            'AI Assistant'
        ],
        cta: 'Đăng ký Starter',
        ctaLink: '/register?plan=STARTER',
        recommended: false,
        color: 'bg-gray-50 border-gray-200'
    },
    {
        name: 'PROFESSIONAL',
        price: '199.000',
        currency: 'VNĐ',
        period: '/tháng',
        description: 'Cho doanh nghiệp chuyên nghiệp',
        features: [
            'Tối đa 100 thành viên',
            '100 Dự án đang hoạt động',
            '100 GB dung lượng lưu trữ',
            'Full HR Module + AI + Webhooks'
        ],
        cta: 'Đăng ký Pro',
        ctaLink: '/register?plan=PROFESSIONAL',
        recommended: true,
        color: 'bg-white border-indigo-600 shadow-xl ring-2 ring-indigo-600 relative overflow-hidden'
    },
    {
        name: 'ENTERPRISE',
        price: 'Liên hệ',
        currency: '',
        period: '',
        description: 'Giải pháp toàn diện cho tập đoàn',
        features: [
            'Không giới hạn thành viên',
            'Không giới hạn dự án',
            'Không giới hạn lưu trữ',
            'SSO / SAML / API + Support 24/7'
        ],
        cta: 'Liên hệ Sale',
        ctaLink: '/contact',
        recommended: false,
        color: 'bg-gray-50 border-gray-200'
    }
];

export default function PricingTable() {
    return (
        <section id="pricing" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Bảng giá linh hoạt</h2>
                    <p className="text-gray-500">Chọn gói phù hợp với quy mô doanh nghiệp của bạn</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                    {plans.map((plan, idx) => (
                        <div key={idx} className={`rounded-2xl p-8 border hover:shadow-lg transition-shadow flex flex-col ${plan.color}`}>
                            {plan.recommended && (
                                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                                    Khuyên dùng
                                </div>
                            )}

                            <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                            <p className="text-sm text-gray-500 mb-6">{plan.description}</p>

                            <div className="flex items-baseline mb-8">
                                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                                <span className="text-gray-500 ml-1 text-sm">{plan.currency}{plan.period}</span>
                            </div>

                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start">
                                        <i className="fa-solid fa-check text-green-500 mt-1 mr-3 text-sm" />
                                        <span className="text-gray-600 text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                to={plan.ctaLink}
                                className={`w-full py-3 px-4 rounded-xl font-medium text-center transition-colors ${plan.recommended
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : 'bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                                    }`}
                            >
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

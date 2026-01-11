import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

// Mock onboarding templates
const MOCK_TEMPLATES = [
    {
        id: 1,
        name: 'Onboarding Kỹ sư phần mềm',
        description: 'Quy trình nhập việc cho vị trí kỹ sư phần mềm',
        duration: 14,
        steps: [
            { id: 1, title: 'Chuẩn bị tài khoản', responsible: 'IT', duration: 1 },
            { id: 2, title: 'Giới thiệu công ty', responsible: 'HR', duration: 1 },
            { id: 3, title: 'Setup máy tính & công cụ', responsible: 'IT', duration: 1 },
            { id: 4, title: 'Training về sản phẩm', responsible: 'PM', duration: 3 },
            { id: 5, title: 'Làm quen với team', responsible: 'Manager', duration: 2 },
            { id: 6, title: 'Nhận task đầu tiên', responsible: 'Tech Lead', duration: 3 },
            { id: 7, title: 'Review sau 2 tuần', responsible: 'HR', duration: 1 },
        ]
    },
    {
        id: 2,
        name: 'Onboarding Nhân viên kinh doanh',
        description: 'Quy trình nhập việc cho vị trí sales',
        duration: 7,
        steps: [
            { id: 1, title: 'Chuẩn bị tài khoản CRM', responsible: 'IT', duration: 1 },
            { id: 2, title: 'Training về sản phẩm', responsible: 'PM', duration: 2 },
            { id: 3, title: 'Training kỹ năng bán hàng', responsible: 'Sales Manager', duration: 2 },
            { id: 4, title: 'Shadowing đồng nghiệp', responsible: 'Senior Sales', duration: 2 },
        ]
    }
];

// Mock active onboarding instances
const MOCK_INSTANCES = [
    { id: 1, employee: { fullName: 'Nguyễn Văn A' }, template: MOCK_TEMPLATES[0], progress: 60, startDate: '2024-01-08', currentStep: 4 },
    { id: 2, employee: { fullName: 'Trần Thị B' }, template: MOCK_TEMPLATES[1], progress: 30, startDate: '2024-01-10', currentStep: 2 },
    { id: 3, employee: { fullName: 'Lê Văn C' }, template: MOCK_TEMPLATES[0], progress: 85, startDate: '2024-01-02', currentStep: 6 },
];

export default function OnboardingPage() {
    const [activeTab, setActiveTab] = useState('active'); // active, templates
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Onboarding</h1>
                    <p className="text-gray-500 text-sm">Quản lý quy trình nhập việc</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    <i className="fa-solid fa-plus mr-2" />
                    {activeTab === 'templates' ? 'Tạo template' : 'Bắt đầu onboarding'}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard label="Đang onboarding" value={MOCK_INSTANCES.length} icon="fa-user-clock" color="bg-blue-500" />
                <StatCard label="Hoàn thành tháng này" value={5} icon="fa-user-check" color="bg-green-500" />
                <StatCard label="Templates" value={MOCK_TEMPLATES.length} icon="fa-file-lines" color="bg-purple-500" />
                <StatCard label="Thời gian TB" value="10 ngày" icon="fa-clock" color="bg-orange-500" />
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="border-b border-gray-100 px-6">
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`py-4 border-b-2 text-sm font-medium transition-colors ${activeTab === 'active'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <i className="fa-solid fa-users mr-2" />
                            Đang thực hiện ({MOCK_INSTANCES.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('templates')}
                            className={`py-4 border-b-2 text-sm font-medium transition-colors ${activeTab === 'templates'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <i className="fa-solid fa-file-lines mr-2" />
                            Templates ({MOCK_TEMPLATES.length})
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'active' ? (
                        <div className="space-y-4">
                            {MOCK_INSTANCES.map(instance => (
                                <OnboardingInstanceCard key={instance.id} instance={instance} />
                            ))}
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                            {MOCK_TEMPLATES.map(template => (
                                <TemplateCard key={template.id} template={template} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }) {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white`}>
                    <i className={`fa-solid ${icon} text-lg`} />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                </div>
            </div>
        </div>
    );
}

function OnboardingInstanceCard({ instance }) {
    const currentStep = instance.template.steps[instance.currentStep - 1];

    return (
        <div className="bg-gray-50 rounded-xl p-5 hover:bg-gray-100/80 transition-colors">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {instance.employee.fullName.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{instance.employee.fullName}</h3>
                        <p className="text-sm text-gray-500">{instance.template.name}</p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${instance.progress >= 80 ? 'bg-green-100 text-green-700' :
                        instance.progress >= 50 ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                    }`}>
                    {instance.progress}% hoàn thành
                </span>
            </div>

            {/* Progress bar */}
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    style={{ width: `${instance.progress}%` }}
                />
            </div>

            {/* Current step */}
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                    <i className="fa-solid fa-arrow-right text-indigo-500" />
                    <span>Bước {instance.currentStep}: {currentStep?.title}</span>
                </div>
                <span className="text-gray-400">
                    Bắt đầu: {new Date(instance.startDate).toLocaleDateString('vi-VN')}
                </span>
            </div>
        </div>
    );
}

function TemplateCard({ template }) {
    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                    <i className="fa-solid fa-file-lines" />
                </div>
                <span className="px-2 py-1 bg-white/80 text-indigo-700 text-xs rounded-full">
                    {template.duration} ngày
                </span>
            </div>

            <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{template.description}</p>

            {/* Steps preview */}
            <div className="space-y-2">
                {template.steps.slice(0, 3).map((step, i) => (
                    <div key={step.id} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs">
                            {i + 1}
                        </div>
                        <span className="truncate">{step.title}</span>
                    </div>
                ))}
                {template.steps.length > 3 && (
                    <div className="text-xs text-gray-400 pl-7">
                        +{template.steps.length - 3} bước nữa
                    </div>
                )}
            </div>

            <button className="w-full mt-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
                <i className="fa-solid fa-play mr-2" /> Sử dụng template
            </button>
        </div>
    );
}

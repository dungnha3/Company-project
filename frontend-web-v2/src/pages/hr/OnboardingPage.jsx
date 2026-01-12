import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

export default function OnboardingPage() {
    const [activeTab, setActiveTab] = useState('active'); // active, templates
    const [showModal, setShowModal] = useState(false);

    // Fetch instances (real data)
    const { data: instances = [], isLoading: loadingInstances } = useQuery({
        queryKey: ['onboarding-instances'],
        queryFn: async () => {
            try {
                return (await apiClient.get(ENDPOINTS.ONBOARDING.INSTANCES)).data;
            } catch (e) {
                return []; // Graceful fallback if endpoint invalid
            }
        }
    });

    // Fetch templates (real data)
    const { data: templates = [], isLoading: loadingTemplates } = useQuery({
        queryKey: ['onboarding-templates'],
        queryFn: async () => {
            try {
                return (await apiClient.get(ENDPOINTS.ONBOARDING.TEMPLATES)).data;
            } catch (e) {
                return [];
            }
        }
    });

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
                <StatCard label="Đang onboarding" value={instances.length} icon="fa-user-clock" color="bg-blue-500" />
                <StatCard label="Hoàn thành tháng này" value={0} icon="fa-user-check" color="bg-green-500" />
                <StatCard label="Templates" value={templates.length} icon="fa-file-lines" color="bg-purple-500" />
                <StatCard label="Thời gian TB" value="--" icon="fa-clock" color="bg-orange-500" />
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
                            Đang thực hiện ({instances.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('templates')}
                            className={`py-4 border-b-2 text-sm font-medium transition-colors ${activeTab === 'templates'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <i className="fa-solid fa-file-lines mr-2" />
                            Templates ({templates.length})
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'active' ? (
                        <div className="space-y-4">
                            {instances.length === 0 && !loadingInstances ? (
                                <div className="text-center py-8 text-gray-500">Chưa có nhân viên nào đang onboarding.</div>
                            ) : instances.map(instance => (
                                <OnboardingInstanceCard key={instance.id} instance={instance} />
                            ))}
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                            {templates.length === 0 && !loadingTemplates ? (
                                <div className="col-span-2 text-center py-8 text-gray-500">Chưa có template quy trình nào.</div>
                            ) : templates.map(template => (
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
    const steps = instance.template?.steps || [];
    const currentStep = steps[Math.max(0, (instance.currentStep || 1) - 1)];

    return (
        <div className="bg-gray-50 rounded-xl p-5 hover:bg-gray-100/80 transition-colors">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {instance.employee?.fullName?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{instance.employee?.fullName || 'Unknown'}</h3>
                        <p className="text-sm text-gray-500">{instance.template?.name || 'Quy trình chung'}</p>
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
                    <span>Bước {instance.currentStep || 1}: {currentStep?.title || 'Đang cập nhật...'}</span>
                </div>
                <span className="text-gray-400">
                    Bắt đầu: {instance.startDate ? new Date(instance.startDate).toLocaleDateString('vi-VN') : '--/--'}
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
                    {template.duration || 0} ngày
                </span>
            </div>

            <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{template.description}</p>

            {/* Steps preview */}
            <div className="space-y-2">
                {(template.steps || []).slice(0, 3).map((step, i) => (
                    <div key={step.id || i} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs">
                            {i + 1}
                        </div>
                        <span className="truncate">{step.title}</span>
                    </div>
                ))}
                {(template.steps?.length || 0) > 3 && (
                    <div className="text-xs text-gray-400 pl-7">
                        +{(template.steps?.length || 0) - 3} bước nữa
                    </div>
                )}
            </div>

            <button className="w-full mt-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
                <i className="fa-solid fa-play mr-2" /> Sử dụng template
            </button>
        </div>
    );
}

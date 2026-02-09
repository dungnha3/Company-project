import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import DataTable from '@shared/components/ui/DataTable';

const PLANS = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];

export default function AdminCompanyDetailPage() {
    const { id: companyId } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('overview');

    // Fetch Company Details
    const { data: company, isLoading } = useQuery({
        queryKey: ['admin-company', companyId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.SYSADMIN.COMPANY_DETAILS(companyId));
            return res.data;
        }
    });

    // Fetch Settings
    const { data: settings = {} } = useQuery({
        queryKey: ['admin-company-settings', companyId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.SYSADMIN.COMPANY_SETTINGS(companyId));
            return res.data;
        },
        enabled: !!companyId
    });

    // Fetch Users
    const { data: users = [] } = useQuery({
        queryKey: ['admin-company-users', companyId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.SYSADMIN.TENANTS.USERS(companyId));
            return res.data;
        },
        enabled: activeTab === 'resources'
    });

    // Fetch Projects
    const { data: projects = [] } = useQuery({
        queryKey: ['admin-company-projects', companyId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.SYSADMIN.TENANTS.PROJECTS(companyId));
            return res.data;
        },
        enabled: activeTab === 'resources'
    });

    // Mutations
    const updateFeaturesMutation = useMutation({
        mutationFn: (data) => apiClient.put(ENDPOINTS.SYSADMIN.COMPANY_FEATURES(companyId), data),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-company-settings']);
            showToast('Đã cập nhật tính năng', 'success');
        },
        onError: (err) => showToast(err.message, 'error')
    });

    const updateQuotaMutation = useMutation({
        mutationFn: (data) => apiClient.put(ENDPOINTS.SYSADMIN.COMPANY_QUOTA(companyId), data),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-company-settings']);
            showToast('Đã cập nhật quota', 'success');
        },
        onError: (err) => showToast(err.message, 'error')
    });

    const updateSettingsMutation = useMutation({
        mutationFn: (data) => apiClient.put(ENDPOINTS.SYSADMIN.COMPANY_SETTINGS(companyId), data),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-company-settings']);
            showToast('Đã cập nhật cài đặt', 'success');
        },
        onError: (err) => showToast(err.message, 'error')
    });

    const changePlanMutation = useMutation({
        mutationFn: (plan) => apiClient.put(`${ENDPOINTS.SYSADMIN.COMPANY_PLAN(companyId)}?plan=${plan}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-company']);
            queryClient.invalidateQueries(['admin-company-settings']);
            showToast('Đã thay đổi gói dịch vụ', 'success');
        },
        onError: (err) => showToast(err.message, 'error')
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="loading-spinner" />
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Tổng quan', icon: 'fa-building' },
        { id: 'features', label: 'Tính năng', icon: 'fa-toggle-on' },
        { id: 'quotas', label: 'Quota', icon: 'fa-gauge-high' },
        { id: 'gps', label: 'GPS', icon: 'fa-location-dot' },
        { id: 'resources', label: 'Tài nguyên', icon: 'fa-users' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/admin/companies')} className="btn-ghost">
                    <i className="fa-solid fa-arrow-left" />
                </button>
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl font-bold">
                        {company?.name?.charAt(0) || 'C'}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{company?.name}</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-gray-500">ID: {companyId}</span>
                            <span className="badge-info">
                                <i className="fa-solid fa-crown mr-1" />
                                {company?.plan || 'FREE'}
                            </span>
                            <span className={company?.isActive ? 'badge-success' : 'badge-danger'}>
                                {company?.isActive ? 'Hoạt động' : 'Tạm dừng'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="card p-2">
                <div className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === tab.id
                                ? 'bg-indigo-500 text-white'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <i className={`fa-solid ${tab.icon}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="card">
                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900">
                            <i className="fa-solid fa-building text-indigo-500 mr-2" />
                            Thông tin chung
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <InfoCard label="Tên công ty" value={company?.name} icon="fa-building" />
                            <InfoCard label="Chủ sở hữu" value={company?.ownerName || 'N/A'} icon="fa-user-tie" />
                            <InfoCard label="Email" value={company?.email || 'N/A'} icon="fa-envelope" />
                            <InfoCard label="Địa chỉ" value={company?.address || 'Chưa cập nhật'} icon="fa-map-marker-alt" />
                            <InfoCard label="Ngày tạo" value={company?.createdAt ? new Date(company.createdAt).toLocaleDateString('vi-VN') : 'N/A'} icon="fa-calendar" />
                            <div className="bg-gray-50 rounded-xl p-4">
                                <label className="label">Thay đổi gói</label>
                                <select
                                    className="input"
                                    value={company?.plan || 'FREE'}
                                    onChange={(e) => changePlanMutation.mutate(e.target.value)}
                                >
                                    {PLANS.map(plan => (
                                        <option key={plan} value={plan}>{plan}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* FEATURES */}
                {activeTab === 'features' && (
                    <div className="space-y-8">
                        {/* Core Modules */}
                        <FeatureSection title="Module chính" icon="fa-cubes">
                            <ToggleField label="HR Module" checked={settings.hrModuleEnabled} onChange={(val) => updateFeaturesMutation.mutate({ hrModuleEnabled: val })} />
                            <ToggleField label="Project Module" checked={settings.projectModuleEnabled} onChange={(val) => updateFeaturesMutation.mutate({ projectModuleEnabled: val })} />
                            <ToggleField label="Chat Module" checked={settings.chatModuleEnabled} onChange={(val) => updateFeaturesMutation.mutate({ chatModuleEnabled: val })} />
                            <ToggleField label="Storage Module" checked={settings.storageModuleEnabled} onChange={(val) => updateFeaturesMutation.mutate({ storageModuleEnabled: val })} />
                            <ToggleField label="AI Module" checked={settings.aiModuleEnabled} onChange={(val) => updateFeaturesMutation.mutate({ aiModuleEnabled: val })} premium />
                        </FeatureSection>

                        {/* HR Sub-features */}
                        <FeatureSection title="Tính năng HR" icon="fa-user-gear" disabled={!settings.hrModuleEnabled}>
                            <ToggleField label="Chấm công" checked={settings.attendanceEnabled} onChange={(val) => updateFeaturesMutation.mutate({ attendanceEnabled: val })} />
                            <ToggleField label="Nghỉ phép" checked={settings.leaveEnabled} onChange={(val) => updateFeaturesMutation.mutate({ leaveEnabled: val })} />
                            <ToggleField label="Bảng lương" checked={settings.salaryEnabled} onChange={(val) => updateFeaturesMutation.mutate({ salaryEnabled: val })} />
                            <ToggleField label="Hợp đồng" checked={settings.contractEnabled} onChange={(val) => updateFeaturesMutation.mutate({ contractEnabled: val })} />
                            <ToggleField label="Đánh giá" checked={settings.reviewEnabled} onChange={(val) => updateFeaturesMutation.mutate({ reviewEnabled: val })} />
                            <ToggleField label="OKRs" checked={settings.okrEnabled} onChange={(val) => updateFeaturesMutation.mutate({ okrEnabled: val })} />
                            <ToggleField label="Skills Matrix" checked={settings.skillsMatrixEnabled} onChange={(val) => updateFeaturesMutation.mutate({ skillsMatrixEnabled: val })} />
                            <ToggleField label="Onboarding" checked={settings.onboardingEnabled} onChange={(val) => updateFeaturesMutation.mutate({ onboardingEnabled: val })} />
                            <ToggleField label="Resource Planning" checked={settings.resourcePlanningEnabled} onChange={(val) => updateFeaturesMutation.mutate({ resourcePlanningEnabled: val })} />
                            <ToggleField label="Org Chart" checked={settings.orgChartEnabled} onChange={(val) => updateFeaturesMutation.mutate({ orgChartEnabled: val })} />
                        </FeatureSection>

                        {/* Project Sub-features */}
                        <FeatureSection title="Tính năng Project" icon="fa-tasks" disabled={!settings.projectModuleEnabled}>
                            <ToggleField label="Time Tracking" checked={settings.timeTrackingEnabled} onChange={(val) => updateFeaturesMutation.mutate({ timeTrackingEnabled: val })} />
                            <ToggleField label="Analytics" checked={settings.analyticsEnabled} onChange={(val) => updateFeaturesMutation.mutate({ analyticsEnabled: val })} />
                            <ToggleField label="Calendar" checked={settings.calendarEnabled} onChange={(val) => updateFeaturesMutation.mutate({ calendarEnabled: val })} />
                        </FeatureSection>

                        {/* Chat Sub-features */}
                        <FeatureSection title="Tính năng Chat" icon="fa-comments" disabled={!settings.chatModuleEnabled}>
                            <ToggleField label="Reactions" checked={settings.chatReactionsEnabled} onChange={(val) => updateFeaturesMutation.mutate({ chatReactionsEnabled: val })} />
                            <ToggleField label="File Sharing" checked={settings.chatFileShareEnabled} onChange={(val) => updateFeaturesMutation.mutate({ chatFileShareEnabled: val })} />
                            <ToggleField label="Threads" checked={settings.chatThreadsEnabled} onChange={(val) => updateFeaturesMutation.mutate({ chatThreadsEnabled: val })} />
                            <ToggleField label="Search" checked={settings.chatSearchEnabled} onChange={(val) => updateFeaturesMutation.mutate({ chatSearchEnabled: val })} />
                        </FeatureSection>

                        {/* Integrations */}
                        <FeatureSection title="Tích hợp" icon="fa-plug">
                            <ToggleField label="Webhooks" checked={settings.webhookEnabled} onChange={(val) => updateFeaturesMutation.mutate({ webhookEnabled: val })} premium />
                        </FeatureSection>
                    </div>
                )}

                {/* QUOTAS */}
                {activeTab === 'quotas' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900">
                            <i className="fa-solid fa-gauge-high text-indigo-500 mr-2" />
                            Giới hạn tài nguyên
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <QuotaInput label="Số nhân viên tối đa" value={settings.maxEmployees} onChange={(val) => updateQuotaMutation.mutate({ maxEmployees: parseInt(val) })} />
                            <QuotaInput label="Số dự án tối đa" value={settings.maxProjects} onChange={(val) => updateQuotaMutation.mutate({ maxProjects: parseInt(val) })} />
                            <QuotaInput label="Dung lượng lưu trữ (bytes)" value={settings.maxStorageBytes} onChange={(val) => updateQuotaMutation.mutate({ maxStorageBytes: parseInt(val) })} suffix={`≈ ${((settings.maxStorageBytes || 0) / 1024 / 1024 / 1024).toFixed(2)} GB`} />
                            <QuotaInput label="Kích thước file upload tối đa (bytes)" value={settings.maxFileUploadBytes} onChange={(val) => updateSettingsMutation.mutate({ maxFileUploadBytes: parseInt(val) })} suffix={`≈ ${((settings.maxFileUploadBytes || 0) / 1024 / 1024).toFixed(0)} MB`} />
                            <QuotaInput label="Số ngày phép/năm" value={settings.maxLeaveDaysPerYear || 12} onChange={(val) => updateSettingsMutation.mutate({ maxLeaveDaysPerYear: parseInt(val) })} suffix="ngày" />
                        </div>
                    </div>
                )}

                {/* GPS */}
                {activeTab === 'gps' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900">
                            <i className="fa-solid fa-location-dot text-red-500 mr-2" />
                            Cài đặt GPS cho chấm công
                        </h3>
                        <p className="text-gray-500 text-sm">Cấu hình vị trí văn phòng và bán kính cho phép chấm công</p>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Vĩ độ (Latitude)</label>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            className="input"
                                            defaultValue={settings.officeLatitude}
                                            onBlur={(e) => updateSettingsMutation.mutate({ officeLatitude: parseFloat(e.target.value) || null })}
                                            placeholder="21.0285"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Kinh độ (Longitude)</label>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            className="input"
                                            defaultValue={settings.officeLongitude}
                                            onBlur={(e) => updateSettingsMutation.mutate({ officeLongitude: parseFloat(e.target.value) || null })}
                                            placeholder="105.8542"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Bán kính cho phép (mét)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        defaultValue={settings.allowedRadius || 100}
                                        onBlur={(e) => updateSettingsMutation.mutate({ allowedRadius: parseFloat(e.target.value) })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Nhân viên phải ở trong bán kính này để chấm công</p>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                                    <i className="fa-solid fa-info-circle text-amber-500 mr-2" />
                                    <span className="text-amber-800">Mở Google Maps, click phải vào vị trí văn phòng để lấy tọa độ.</span>
                                </div>
                            </div>

                            <div className="bg-gray-100 rounded-xl overflow-hidden h-64">
                                {settings.officeLatitude && settings.officeLongitude ? (
                                    <iframe
                                        title="Office Location"
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        loading="lazy"
                                        src={`https://www.google.com/maps?q=${settings.officeLatitude},${settings.officeLongitude}&z=16&output=embed`}
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">
                                        <div className="text-center">
                                            <i className="fa-solid fa-map-location-dot text-4xl mb-2" />
                                            <p className="text-sm">Nhập tọa độ để xem bản đồ</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* RESOURCES */}
                {activeTab === 'resources' && (
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    <i className="fa-solid fa-users text-blue-500 mr-2" />
                                    Nhân viên
                                </h3>
                                <span className="badge-info">{users.length} người</span>
                            </div>
                            <DataTable
                                columns={[
                                    { header: 'Tên', accessorKey: 'username' },
                                    { header: 'Email', accessorKey: 'email' },
                                    {
                                        header: 'Vai trò', accessorKey: 'role', cell: (row) => (
                                            <div className="flex gap-1 flex-wrap">
                                                {(row.role || []).map(r => (
                                                    <span key={r} className="badge bg-indigo-100 text-indigo-700">{r}</span>
                                                ))}
                                            </div>
                                        )
                                    },
                                    { header: 'Ngày tham gia', accessorKey: 'joinedAt', cell: (row) => new Date(row.joinedAt).toLocaleDateString('vi-VN') },
                                ]}
                                data={users}
                                totalCount={users.length}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    <i className="fa-solid fa-diagram-project text-purple-500 mr-2" />
                                    Dự án
                                </h3>
                                <span className="badge bg-purple-100 text-purple-700">{projects.length} dự án</span>
                            </div>
                            <DataTable
                                columns={[
                                    { header: 'Tên dự án', accessorKey: 'name' },
                                    {
                                        header: 'Trạng thái', accessorKey: 'status', cell: (row) => (
                                            <span className={row.status === 'ACTIVE' ? 'badge-success' : 'badge'}>{row.status}</span>
                                        )
                                    },
                                    { header: 'PM', accessorKey: 'pmName' },
                                ]}
                                data={projects}
                                totalCount={projects.length}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Sub-components
function InfoCard({ label, value, icon }) {
    return (
        <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-gray-500">
                    <i className={`fa-solid ${icon}`} />
                </div>
                <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-semibold text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );
}

function FeatureSection({ title, icon, children, disabled }) {
    return (
        <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
            <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <i className={`fa-solid ${icon} text-indigo-500`} />
                {title}
                {disabled && <span className="text-xs text-gray-400 ml-2">(Đã tắt module chính)</span>}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {children}
            </div>
        </div>
    );
}

function ToggleField({ label, checked, onChange, premium }) {
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                {premium && <span className="badge bg-amber-100 text-amber-700 text-xs">Premium</span>}
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-gray-300'}`}
            >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${checked ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}`} />
            </button>
        </div>
    );
}

function QuotaInput({ label, value, onChange, suffix }) {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    return (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <label className="label">{label}</label>
            <div className="flex gap-2 items-center">
                <input
                    type="number"
                    className="input"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={(e) => onChange(e.target.value)}
                />
                {suffix && <span className="text-sm text-gray-500 whitespace-nowrap">{suffix}</span>}
            </div>
        </div>
    );
}

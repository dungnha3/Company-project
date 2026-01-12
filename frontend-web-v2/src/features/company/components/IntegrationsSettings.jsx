import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

export default function IntegrationsSettings({ workspace }) {
    const [activeTab, setActiveTab] = useState('webhooks');

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('webhooks')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                            ${activeTab === 'webhooks'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        <i className="fa-solid fa-network-wired" />
                        Webhooks
                    </button>
                    <button
                        onClick={() => setActiveTab('sso')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                            ${activeTab === 'sso'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        <i className="fa-solid fa-key" />
                        Single Sign-On (SSO)
                    </button>
                </nav>
            </div>

            {activeTab === 'webhooks' && <WebhooksList workspace={workspace} />}
            {activeTab === 'sso' && <SSOSettings workspace={workspace} />}
        </div>
    );
}

function SSOSettings({ workspace }) {
    const toast = useToast();
    const [config, setConfig] = useState({
        provider: 'google',
        clientId: '',
        clientSecret: '',
        enabled: false,
        domain: '',
    });

    const handleChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    // Fetch SSO Config
    const { data: fetchConfig } = useQuery({
        queryKey: ['sso-config', workspace.id],
        queryFn: async () => {
            try {
                return (await apiClient.get(ENDPOINTS.INTEGRATION.SSO_CONFIG)).data;
            } catch (error) {
                return null;
            }
        },
        onSuccess: (data) => {
            if (data) {
                setConfig({
                    provider: data.provider || 'google',
                    clientId: data.clientId || '',
                    clientSecret: data.clientSecret || '',
                    enabled: data.enabled ?? false,
                    domain: data.domain || '',
                });
            }
        }
    });

    // Save Mutation
    const saveMutation = useMutation({
        mutationFn: async (newConfig) => {
            return (await apiClient.post(ENDPOINTS.INTEGRATION.SSO_CONFIG, newConfig)).data;
        },
        onSuccess: () => {
            toast.success('Lưu cấu hình SSO thành công');
        },
        onError: (err) => {
            toast.error('Lỗi lưu cấu hình: ' + (err.response?.data?.message || err.message));
        }
    });

    const handleSave = (e) => {
        e.preventDefault();
        saveMutation.mutate(config);
    };

    return (
        <div className="max-w-2xl">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex gap-3">
                <i className="fa-solid fa-triangle-exclamation text-yellow-600 mt-1" />
                <div>
                    <h4 className="text-sm font-bold text-yellow-800">Tính năng Enterprise</h4>
                    <p className="text-sm text-yellow-700">
                        Cấu hình SSO chỉ khả dụng cho gói Enterprise. Vui lòng nâng cấp để sử dụng.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Cấu hình SAML / OIDC</h3>
                <form className="space-y-4" onSubmit={handleSave}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                        <select
                            value={config.provider}
                            onChange={(e) => handleChange('provider', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900"
                        >
                            <option value="google">Google Workspace</option>
                            <option value="azure">Microsoft Azure AD</option>
                            <option value="okta">Okta</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Client ID / Entity ID</label>
                        <input
                            type="text"
                            value={config.clientId}
                            onChange={(e) => handleChange('clientId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-900"
                            placeholder="e.g. 123456789-abc..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret / Certificate</label>
                        <input
                            type="password"
                            value={config.clientSecret}
                            onChange={(e) => handleChange('clientSecret', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-900"
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Domain</label>
                        <input
                            type="text"
                            value={config.domain}
                            onChange={(e) => handleChange('domain', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-900"
                            placeholder="e.g. mycompany.com"
                        />
                    </div>
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={saveMutation.isPending}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {saveMutation.isPending ? <i className="fa-solid fa-spinner fa-spin mr-2" /> : null}
                            Lưu cấu hình
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function WebhooksList({ workspace }) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);

    // Fetch webhooks
    const { data: webhooks, isLoading } = useQuery({
        queryKey: ['webhooks', workspace.id],
        queryFn: async () => (await apiClient.get(ENDPOINTS.INTEGRATION.WEBHOOKS)).data,
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => apiClient.delete(ENDPOINTS.INTEGRATION.WEBHOOK_BY_ID(id)),
        onSuccess: () => {
            toast.success('Xóa webhook thành công');
            queryClient.invalidateQueries(['webhooks']);
        },
        onError: () => toast.error('Lỗi khi xóa webhook')
    });

    // Test mutation
    const testMutation = useMutation({
        mutationFn: async (id) => apiClient.post(ENDPOINTS.INTEGRATION.TEST_WEBHOOK(id)),
        onSuccess: () => toast.success('Webhook test sent successfully!'),
        onError: () => toast.error('Failed to send test webhook')
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Webhooks</h3>
                    <p className="text-sm text-gray-500">Kết nối với các ứng dụng bên ngoài như Slack, Microsoft Teams, Discord...</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                    <i className="fa-solid fa-plus" />
                    Thêm Webhook
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">URL</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Events</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr><td colSpan="4" className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-gray-400" /></td></tr>
                        ) : webhooks?.length === 0 ? (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-500">Chưa có webhook nào.</td></tr>
                        ) : (
                            webhooks?.map(wh => (
                                <tr key={wh.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                                <i className="fa-solid fa-globe" />
                                            </div>
                                            <span className="font-medium text-gray-900 truncate max-w-[200px]" title={wh.url}>{wh.url}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {wh.events?.slice(0, 3).map(evt => (
                                                <span key={evt} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100">{evt}</span>
                                            ))}
                                            {wh.events?.length > 3 && <span className="text-xs text-gray-400">+{wh.events.length - 3} more</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${wh.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {wh.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => testMutation.mutate(wh.id)}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Test Webhook"
                                            >
                                                <i className="fa-solid fa-paper-plane" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Delete this webhook?')) deleteMutation.mutate(wh.id);
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <i className="fa-solid fa-trash" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && <WebhookModal onClose={() => setShowModal(false)} />}
        </div>
    );
}

function WebhookModal({ onClose }) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        url: '',
        secret: '',
        events: [],
        isActive: true
    });

    const EVENT_OPTIONS = [
        { id: 'issue.created', label: 'Issue Created' },
        { id: 'issue.updated', label: 'Issue Updated' },
        { id: 'issue.status_changed', label: 'Issue Status Change' },
        { id: 'comment.created', label: 'New Comment' },
        { id: 'sprint.started', label: 'Sprint Started' },
        { id: 'sprint.completed', label: 'Sprint Completed' },
    ];

    const createMutation = useMutation({
        mutationFn: async (data) => apiClient.post(ENDPOINTS.INTEGRATION.WEBHOOKS, data),
        onSuccess: () => {
            toast.success('Webhook created successfully');
            queryClient.invalidateQueries(['webhooks']);
            onClose();
        },
        onError: (err) => toast.error('Error: ' + (err.response?.data?.message || err.message))
    });

    const handleEventToggle = (eventId) => {
        setFormData(prev => {
            const events = prev.events.includes(eventId)
                ? prev.events.filter(e => e !== eventId)
                : [...prev.events, eventId];
            return { ...prev, events };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.url) return toast.error('URL is required');
        if (formData.events.length === 0) return toast.error('Select at least one event');
        createMutation.mutate(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Add New Webhook</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fa-solid fa-times text-xl" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="label">Payload URL <span className="text-red-500">*</span></label>
                        <input
                            type="url"
                            className="input"
                            placeholder="https://api.example.com/webhook"
                            value={formData.url}
                            onChange={e => setFormData({ ...formData, url: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Secret (Optional)</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Signing secret"
                            value={formData.secret}
                            onChange={e => setFormData({ ...formData, secret: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label mb-2 block">Events</label>
                        <div className="grid grid-cols-2 gap-2">
                            {EVENT_OPTIONS.map(evt => (
                                <label key={evt.id} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.events.includes(evt.id)}
                                        onChange={() => handleEventToggle(evt.id)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700">{evt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="btn-primary"
                        >
                            {createMutation.isPending ? 'Creating...' : 'Create Webhook'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


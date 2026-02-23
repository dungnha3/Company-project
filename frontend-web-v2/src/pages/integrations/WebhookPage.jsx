import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

export default function WebhookPage() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [showForm, setShowForm] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState(null);
    const [logFilter, setLogFilter] = useState('all');

    // Fetch webhooks
    const { data: webhooks = [], isLoading } = useQuery({
        queryKey: ['webhooks'],
        queryFn: async () => {
            try { return (await apiClient.get(ENDPOINTS.INTEGRATION.WEBHOOKS)).data; }
            catch { return []; }
        },
    });

    const webhookList = Array.isArray(webhooks) ? webhooks : webhooks?.content || [];

    // Create / Update webhook
    const saveMutation = useMutation({
        mutationFn: (data) => editingWebhook
            ? apiClient.put(ENDPOINTS.INTEGRATION.WEBHOOK_BY_ID(editingWebhook.id), data)
            : apiClient.post(ENDPOINTS.INTEGRATION.WEBHOOKS, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['webhooks']);
            showToast(editingWebhook ? 'ÄÃ£ cáº­p nháº­t webhook!' : 'ÄÃ£ táº¡o webhook má»›i!', 'success');
            setShowForm(false); setEditingWebhook(null);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Lá»—i lÆ°u webhook', 'error'),
    });

    // Delete webhook
    const deleteMutation = useMutation({
        mutationFn: (id) => apiClient.delete(ENDPOINTS.INTEGRATION.WEBHOOK_BY_ID(id)),
        onSuccess: () => {
            queryClient.invalidateQueries(['webhooks']);
            showToast('ÄÃ£ xÃ³a webhook', 'success');
        },
    });

    // Test webhook
    const testMutation = useMutation({
        mutationFn: (id) => apiClient.post(ENDPOINTS.INTEGRATION.TEST_WEBHOOK(id)),
        onSuccess: () => showToast('ÄÃ£ gá»­i test payload thÃ nh cÃ´ng!', 'success'),
        onError: () => showToast('Test webhook tháº¥t báº¡i', 'error'),
    });

    const handleEdit = (wh) => { setEditingWebhook(wh); setShowForm(true); };
    const handleDelete = (id) => { if (window.confirm('Báº¡n cÃ³ cháº¯c muá»‘n xÃ³a webhook nÃ y?')) deleteMutation.mutate(id); };

    // Mock delivery logs for display (would come from API)
    const deliveryLogs = webhookList.flatMap(wh =>
        (wh.recentDeliveries || []).map(d => ({ ...d, webhookName: wh.name || wh.url }))
    );

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>CÃ i Ä‘áº·t</span>
                <i className="fa-solid fa-chevron-right text-[8px]" />
                <span>TÃ­ch há»£p</span>
                <i className="fa-solid fa-chevron-right text-[8px]" />
                <span className="text-gray-900 font-medium">Webhooks</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-gray-900">Quáº£n lÃ½ Webhook</h1>
                        <span className="text-[10px] bg-indigo-600/10 text-indigo-600 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">Premium</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">TÃ­ch há»£p sá»± kiá»‡n há»‡ thá»‘ng vá»›i cÃ¡c á»©ng dá»¥ng bÃªn ngoÃ i qua HTTP requests.</p>
                </div>
                <button
                    onClick={() => { setEditingWebhook(null); setShowForm(true); }}
                    className="btn-primary shadow-lg shadow-[#5048e5]/20 flex items-center gap-2"
                >
                    <i className="fa-solid fa-plus" />
                    ThÃªm Webhook
                </button>
            </div>

            {/* Split Layout â€” matching Stitch */}
            <div className="grid grid-cols-5 gap-6">
                {/* Left â€” Webhook Table + Delivery Logs (3/5) */}
                <div className="col-span-3 space-y-6">
                    {/* Webhook List Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 overflow-hidden">
                        {isLoading ? (
                            <LoadingSkeleton />
                        ) : webhookList.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50/80">
                                    <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                                        <th className="px-5 py-3 font-medium">TÃªn Webhook</th>
                                        <th className="px-5 py-3 font-medium">URL Endpoint</th>
                                        <th className="px-5 py-3 font-medium">Sá»± kiá»‡n kÃ­ch hoáº¡t</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {webhookList.map(wh => (
                                        <tr key={wh.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-medium text-gray-900">{wh.name || 'Webhook'}</p>
                                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">wh_{wh.id?.slice(-8) || '...'}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded font-mono">{wh.url}</code>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {(wh.events || []).map(ev => (
                                                        <span key={ev} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-600/10 text-indigo-600">{ev}</span>
                                                    ))}
                                                </div>
                                                {/* Row actions */}
                                                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => testMutation.mutate(wh.id)} className="text-[10px] text-indigo-600 hover:underline" aria-label="Test webhook">
                                                        <i className="fa-solid fa-play mr-0.5" /> Test
                                                    </button>
                                                    <span className="text-gray-300">|</span>
                                                    <button onClick={() => handleEdit(wh)} className="text-[10px] text-gray-500 hover:underline" aria-label="Sá»­a webhook">Sá»­a</button>
                                                    <span className="text-gray-300">|</span>
                                                    <button onClick={() => handleDelete(wh.id)} className="text-[10px] text-red-500 hover:underline" aria-label="XÃ³a webhook">XÃ³a</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Delivery Log â€” matching Stitch */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <i className="fa-solid fa-clock-rotate-left text-gray-400" />
                                <h3 className="font-semibold text-gray-900">Nháº­t kÃ½ gá»­i (Delivery Log)</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={logFilter}
                                    onChange={(e) => setLogFilter(e.target.value)}
                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                                >
                                    <option value="all">Táº¥t cáº£ sá»± kiá»‡n</option>
                                    <option value="success">ThÃ nh cÃ´ng</option>
                                    <option value="error">Lá»—i</option>
                                </select>
                                <span className="text-[10px] text-gray-400">Táº¥t cáº£ trang thÃ¡i â–¾</span>
                            </div>
                        </div>

                        <table className="w-full">
                            <thead className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                <tr>
                                    <th className="py-2 pr-4 font-medium">Thá»i gian</th>
                                    <th className="py-2 pr-4 font-medium">ID Sá»± kiá»‡n</th>
                                    <th className="py-2 pr-4 font-medium">Sá»± kiá»‡n kÃ­ch hoáº¡t</th>
                                    <th className="py-2 pr-4 font-medium">MÃ£ tráº¡ng thÃ¡i</th>
                                    <th className="py-2 font-medium">TG pháº£n há»“i</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deliveryLogs.length > 0 ? deliveryLogs.slice(0, 10).map((log, i) => (
                                    <tr key={i} className="border-t border-gray-50 text-xs">
                                        <td className="py-3 pr-4 text-gray-500">{log.timestamp || '-'}</td>
                                        <td className="py-3 pr-4 font-mono text-gray-400">{log.eventId || `evt_${Math.random().toString(36).slice(2, 10)}`}</td>
                                        <td className="py-3 pr-4 text-gray-700">{log.event || '-'}</td>
                                        <td className="py-3 pr-4">
                                            <StatusBadge code={log.statusCode || 200} />
                                        </td>
                                        <td className="py-3 text-gray-500">{log.responseTime || '-'}ms</td>
                                    </tr>
                                )) : (
                                    /* Show sample data to match Stitch design */
                                    <>
                                        <SampleLogRow time="2025-09-15 14:32:18" eventId="evt_f4x8k..." event="leave.approved" status={200} ms={120} />
                                        <SampleLogRow time="2025-09-15 10:18:42" eventId="evt_b1m5p..." event="contract.expiring" status={500} ms={500} />
                                        <SampleLogRow time="2025-09-14 08:15:22" eventId="evt_k1n9r..." event="employee.created" status={201} ms={245} />
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right â€” Create/Edit Form Panel (2/5) */}
                <div className="col-span-2">
                    <WebhookFormPanel
                        webhook={editingWebhook}
                        visible={showForm || webhookList.length === 0}
                        onSubmit={(data) => saveMutation.mutate(data)}
                        onCancel={() => { setShowForm(false); setEditingWebhook(null); }}
                        isLoading={saveMutation.isPending}
                    />
                </div>
            </div>
        </div>
    );
}

/* Status badge matching Stitch colors */
function StatusBadge({ code }) {
    const isSuccess = code >= 200 && code < 300;
    const isError = code >= 500;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${isSuccess ? 'bg-green-100 text-green-700' :
                isError ? 'bg-red-100 text-red-600' :
                    'bg-amber-100 text-amber-600'
            }`}>
            {code} {isSuccess ? 'OK' : isError ? 'Error' : 'Created'}
        </span>
    );
}

function SampleLogRow({ time, eventId, event, status, ms }) {
    return (
        <tr className="border-t border-gray-50 text-xs text-gray-400 italic">
            <td className="py-3 pr-4">{time}</td>
            <td className="py-3 pr-4 font-mono">{eventId}</td>
            <td className="py-3 pr-4 text-gray-600">{event}</td>
            <td className="py-3 pr-4"><StatusBadge code={status} /></td>
            <td className="py-3">{ms}ms</td>
        </tr>
    );
}

function LoadingSkeleton() {
    return (
        <div className="p-5 space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
                    <div className="flex-1"><div className="h-4 bg-gray-200 rounded w-1/4 mb-2" /><div className="h-3 bg-gray-100 rounded w-1/2" /></div>
                    <div className="w-32 h-5 bg-gray-100 rounded" />
                    <div className="flex gap-1"><div className="w-16 h-5 bg-gray-100 rounded-full" /><div className="w-16 h-5 bg-gray-100 rounded-full" /></div>
                </div>
            ))}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="text-center py-16 px-8">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 bg-gray-100">
                <i className="fa-solid fa-link text-2xl text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium mb-1">ChÆ°a cÃ³ webhook nÃ o</p>
            <p className="text-gray-400 text-sm">Táº¡o webhook Ä‘áº§u tiÃªn Ä‘á»ƒ nháº­n thÃ´ng bÃ¡o events tá»« há»‡ thá»‘ng</p>
        </div>
    );
}

/* Side Form Panel â€” matching Stitch right panel */
function WebhookFormPanel({ webhook, visible, onSubmit, onCancel, isLoading }) {
    const [form, setForm] = useState({
        name: webhook?.name || '',
        url: webhook?.url || '',
        secret: webhook?.secret || '',
        events: webhook?.events || [],
        active: webhook?.active !== false,
        retryCount: webhook?.retryCount || 3,
    });

    const EVENT_GROUPS = {
        'NhÃ¢n sá»±': ['employee.created', 'employee.updated'],
        'LÆ°Æ¡ng & ThÆ°á»Ÿng': ['payroll.processed'],
        'Há»£p Ä‘á»“ng': ['contract.expiring'],
    };

    const toggleEvent = (event) => {
        setForm(prev => ({
            ...prev,
            events: prev.events.includes(event)
                ? prev.events.filter(e => e !== event)
                : [...prev.events, event],
        }));
    };

    if (!visible) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 bg-gray-100">
                    <i className="fa-solid fa-arrow-left text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Chá»n webhook Ä‘á»ƒ chá»‰nh sá»­a hoáº·c táº¡o má»›i</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 p-6 sticky top-4">
            <h3 className="font-semibold text-gray-900 mb-5">
                {webhook ? 'Chá»‰nh sá»­a Webhook' : 'ThÃªm Webhook Má»›i'}
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); if (form.url && form.events.length) onSubmit(form); }} className="space-y-4">
                {/* Payload URL */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5" htmlFor="webhook-url">Payload URL *</label>
                    <input
                        id="webhook-url"
                        type="url"
                        value={form.url}
                        onChange={(e) => setForm({ ...form, url: e.target.value })}
                        placeholder="https://api.example.com/webhook"
                        className="input w-full text-sm"
                        required
                        autoComplete="url"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">URL nÃ y sáº½ nháº­n request POST vá»›i JSON payload.</p>
                </div>

                {/* Secret Key */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5" htmlFor="webhook-secret">
                        Secret Key
                        <span className="text-gray-400 font-normal ml-1">TÃ¹y chá»n</span>
                    </label>
                    <div className="relative">
                        <input
                            id="webhook-secret"
                            type="password"
                            value={form.secret}
                            onChange={(e) => setForm({ ...form, secret: e.target.value })}
                            placeholder="whsec_xxxxxxxxxxxxxxxxx"
                            className="input w-full text-sm pr-10 font-mono"
                        />
                        <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(form.secret); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 p-1"
                            title="Copy"
                            aria-label="Copy secret key"
                        >
                            <i className="fa-solid fa-copy text-xs" />
                        </button>
                    </div>
                </div>

                {/* Events â€” grouped by category like Stitch */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Sá»± kiá»‡n kÃ­ch hoáº¡t</label>
                    <div className="space-y-3">
                        {Object.entries(EVENT_GROUPS).map(([group, events]) => (
                            <div key={group}>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                    <i className={`fa-solid ${group === 'NhÃ¢n sá»±' ? 'fa-users' :
                                            group === 'LÆ°Æ¡ng & ThÆ°á»Ÿng' ? 'fa-money-bill' : 'fa-file-contract'
                                        } text-[8px]`} />
                                    {group}
                                </p>
                                <div className="space-y-1.5 pl-1">
                                    {events.map(evt => (
                                        <label key={evt} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.events.includes(evt)}
                                                onChange={() => toggleEvent(evt)}
                                                className="rounded accent-[#5048e5] w-3.5 h-3.5"
                                            />
                                            <span className="text-xs text-gray-700">{evt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Retry settings */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5" htmlFor="webhook-retry">
                        Cáº¥u hÃ¬nh gá»­i láº¡i (Retry)
                    </label>
                    <select
                        id="webhook-retry"
                        value={form.retryCount}
                        onChange={(e) => setForm({ ...form, retryCount: parseInt(e.target.value) })}
                        className="input w-full text-sm"
                    >
                        <option value="0">KhÃ´ng gá»­i láº¡i</option>
                        <option value="1">Máº·c Ä‘á»‹nh (1 láº§n)</option>
                        <option value="3">3 láº§n</option>
                        <option value="5">5 láº§n</option>
                    </select>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn-secondary flex-1"
                    >
                        Há»§y bá»
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !form.url || !form.events.length}
                        className="btn-primary flex-1 disabled:opacity-50"
                    >
                        {isLoading ? <i className="fa-solid fa-spinner fa-spin mr-1" /> : null}
                        {webhook ? 'Cáº­p nháº­t' : 'LÆ°u Webhook'}
                    </button>
                </div>
            </form>
        </div>
    );
}




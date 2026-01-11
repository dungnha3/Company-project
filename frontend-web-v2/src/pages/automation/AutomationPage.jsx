import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { automationApi } from '../../shared/api/featureApi';

const TRIGGER_TYPES = {
    ISSUE_CREATED: 'Khi tạo issue mới',
    ISSUE_UPDATED: 'Khi cập nhật issue',
    STATUS_CHANGED: 'Khi thay đổi status',
    ASSIGNEE_CHANGED: 'Khi thay đổi người được giao',
    PRIORITY_CHANGED: 'Khi thay đổi priority',
    COMMENT_ADDED: 'Khi có comment mới'
};

const ACTION_TYPES = {
    UPDATE_FIELD: 'Cập nhật field',
    SEND_NOTIFICATION: 'Gửi thông báo',
    ADD_COMMENT: 'Thêm comment',
    ASSIGN_TO: 'Gán cho user'
};

const OPERATORS = {
    EQUALS: '=',
    NOT_EQUALS: '≠',
    CONTAINS: 'chứa',
    IS_EMPTY: 'trống',
    IS_NOT_EMPTY: 'không trống'
};

export default function AutomationPage() {
    const { projectId } = useParams();
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        triggerType: 'STATUS_CHANGED',
        conditions: [],
        actions: []
    });

    useEffect(() => {
        if (projectId) loadRules();
    }, [projectId]);

    const loadRules = async () => {
        try {
            setLoading(true);
            const data = await automationApi.getProjectRules(projectId);
            setRules(data);
        } catch (error) {
            console.error('Failed to load rules:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await automationApi.createRule({
                projectId: Number(projectId),
                ...formData
            });
            setShowForm(false);
            setFormData({ name: '', description: '', triggerType: 'STATUS_CHANGED', conditions: [], actions: [] });
            loadRules();
        } catch (error) {
            console.error('Failed to create rule:', error);
            alert('Không thể tạo rule');
        }
    };

    const handleToggle = async (ruleId) => {
        try {
            await automationApi.toggleRule(ruleId);
            loadRules();
        } catch (error) {
            console.error('Failed to toggle rule:', error);
        }
    };

    const handleDelete = async (ruleId) => {
        if (!confirm('Bạn có chắc muốn xóa rule này?')) return;
        try {
            await automationApi.deleteRule(ruleId);
            loadRules();
        } catch (error) {
            console.error('Failed to delete rule:', error);
        }
    };

    const addCondition = () => {
        setFormData({
            ...formData,
            conditions: [...formData.conditions, { field: 'status', operator: 'EQUALS', value: '' }]
        });
    };

    const addAction = () => {
        setFormData({
            ...formData,
            actions: [...formData.actions, { actionType: 'UPDATE_FIELD', actionConfig: '{}' }]
        });
    };

    const removeCondition = (idx) => {
        setFormData({
            ...formData,
            conditions: formData.conditions.filter((_, i) => i !== idx)
        });
    };

    const removeAction = (idx) => {
        setFormData({
            ...formData,
            actions: formData.actions.filter((_, i) => i !== idx)
        });
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">⚡ Automation Rules</h1>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
                >
                    + Tạo Rule
                </button>
            </div>

            {/* Rules List */}
            {loading ? (
                <div className="text-center text-slate-400 py-16">Đang tải...</div>
            ) : rules.length === 0 ? (
                <div className="text-center py-20 bg-slate-800 rounded-2xl border border-slate-700">
                    <p className="text-slate-400 text-lg mb-4">Chưa có automation rule nào</p>
                    <p className="text-slate-500 text-sm">Tạo rule để tự động hóa workflow của bạn!</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {rules.map(rule => (
                        <div key={rule.ruleId} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                        {rule.name}
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${rule.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'}`}>
                                            {rule.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </h3>
                                    {rule.description && <p className="text-slate-400 text-sm mt-1">{rule.description}</p>}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleToggle(rule.ruleId)}
                                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                                    >
                                        {rule.isActive ? '⏸ Tắt' : '▶ Bật'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(rule.ruleId)}
                                        className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded-lg transition-colors"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 text-sm">
                                <span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full">
                                    🎯 {TRIGGER_TYPES[rule.triggerType] || rule.triggerType}
                                </span>
                                {rule.conditions?.length > 0 && (
                                    <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full">
                                        📋 {rule.conditions.length} điều kiện
                                    </span>
                                )}
                                {rule.actions?.length > 0 && (
                                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                                        ⚡ {rule.actions.length} hành động
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Rule Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto py-10" onClick={() => setShowForm(false)}>
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-semibold text-white mb-5">⚡ Tạo Automation Rule</h2>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {/* Basic Info */}
                            <input type="text" placeholder="Tên rule *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required
                                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500" />
                            <textarea placeholder="Mô tả (tùy chọn)" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 min-h-[60px] resize-y" />

                            {/* Trigger */}
                            <div className="bg-slate-900 p-4 rounded-lg">
                                <h3 className="text-sm font-medium text-slate-400 mb-2">🎯 Khi nào chạy (Trigger)</h3>
                                <select value={formData.triggerType} onChange={e => setFormData({ ...formData, triggerType: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500">
                                    {Object.entries(TRIGGER_TYPES).map(([key, val]) => <option key={key} value={key}>{val}</option>)}
                                </select>
                            </div>

                            {/* Conditions */}
                            <div className="bg-slate-900 p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-sm font-medium text-slate-400">📋 Điều kiện (IF)</h3>
                                    <button type="button" onClick={addCondition} className="text-indigo-400 text-sm hover:underline">+ Thêm</button>
                                </div>
                                {formData.conditions.length === 0 ? (
                                    <p className="text-slate-500 text-sm">Không có điều kiện = luôn chạy</p>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {formData.conditions.map((cond, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input type="text" placeholder="Field (status, priority...)" value={cond.field}
                                                    onChange={e => {
                                                        const newConds = [...formData.conditions];
                                                        newConds[idx].field = e.target.value;
                                                        setFormData({ ...formData, conditions: newConds });
                                                    }}
                                                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm" />
                                                <select value={cond.operator}
                                                    onChange={e => {
                                                        const newConds = [...formData.conditions];
                                                        newConds[idx].operator = e.target.value;
                                                        setFormData({ ...formData, conditions: newConds });
                                                    }}
                                                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm">
                                                    {Object.entries(OPERATORS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                </select>
                                                <input type="text" placeholder="Giá trị" value={cond.value}
                                                    onChange={e => {
                                                        const newConds = [...formData.conditions];
                                                        newConds[idx].value = e.target.value;
                                                        setFormData({ ...formData, conditions: newConds });
                                                    }}
                                                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm" />
                                                <button type="button" onClick={() => removeCondition(idx)} className="text-red-400 hover:text-red-300">✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="bg-slate-900 p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-sm font-medium text-slate-400">⚡ Hành động (THEN)</h3>
                                    <button type="button" onClick={addAction} className="text-indigo-400 text-sm hover:underline">+ Thêm</button>
                                </div>
                                {formData.actions.length === 0 ? (
                                    <p className="text-slate-500 text-sm">Thêm ít nhất 1 hành động</p>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {formData.actions.map((action, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <select value={action.actionType}
                                                    onChange={e => {
                                                        const newActions = [...formData.actions];
                                                        newActions[idx].actionType = e.target.value;
                                                        setFormData({ ...formData, actions: newActions });
                                                    }}
                                                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm">
                                                    {Object.entries(ACTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                </select>
                                                <input type="text" placeholder='Config JSON: {"field":"status","value":"Done"}'
                                                    value={action.actionConfig}
                                                    onChange={e => {
                                                        const newActions = [...formData.actions];
                                                        newActions[idx].actionConfig = e.target.value;
                                                        setFormData({ ...formData, actions: newActions });
                                                    }}
                                                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm" />
                                                <button type="button" onClick={() => removeAction(idx)} className="text-red-400 hover:text-red-300">✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 justify-end mt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors">Hủy</button>
                                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">Tạo Rule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

const STATUS_CONFIG = {
    ON_TRACK: { label: 'Đúng tiến độ', color: 'bg-green-100 text-green-700', icon: 'fa-check-circle' },
    IN_PROGRESS: { label: 'Đang thực hiện', color: 'bg-blue-100 text-blue-700', icon: 'fa-spinner' },
    AT_RISK: { label: 'Có rủi ro', color: 'bg-yellow-100 text-yellow-700', icon: 'fa-exclamation-triangle' },
    BEHIND: { label: 'Chậm tiến độ', color: 'bg-red-100 text-red-700', icon: 'fa-times-circle' },
    COMPLETED: { label: 'Hoàn thành', color: 'bg-purple-100 text-purple-700', icon: 'fa-trophy' },
};

export default function OKRPage() {
    const [showModal, setShowModal] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState('Q1-2024');
    const [viewMode, setViewMode] = useState('list'); // list, grid
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // Fetch OKRs
    const { data: objectives = [], isLoading } = useQuery({
        queryKey: ['okrs', selectedPeriod],
        queryFn: async () => {
            try {
                return (await apiClient.get(ENDPOINTS.OKR.LIST, { params: { period: selectedPeriod } })).data;
            } catch (e) {
                return [];
            }
        }
    });

    // Create OKR
    const createMutation = useMutation({
        mutationFn: async (newOKR) => {
            return (await apiClient.post(ENDPOINTS.OKR.CREATE, newOKR)).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['okrs']);
            showToast('Tạo OKR thành công', 'success');
            setShowModal(false);
        },
        onError: (err) => {
            showToast('Không thể tạo OKR: ' + (err.response?.data?.message || err.message), 'error');
        }
    });

    // Calculate overall stats
    const stats = {
        total: objectives.length,
        onTrack: objectives.filter(o => o.status === 'ON_TRACK').length,
        atRisk: objectives.filter(o => o.status === 'AT_RISK' || o.status === 'BEHIND').length,
        avgProgress: objectives.length ? Math.round(objectives.reduce((sum, o) => sum + (o.progress || 0), 0) / objectives.length) : 0,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">OKR & KPI</h1>
                    <p className="text-gray-500 text-sm">Quản lý mục tiêu và kết quả then chốt</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Period Selector */}
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="input py-2 text-sm"
                    >
                        <option value="Q1-2024">Q1-2024</option>
                        <option value="Q2-2024">Q2-2024</option>
                        <option value="2024">Năm 2024</option>
                    </select>

                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'
                                }`}
                        >
                            <i className="fa-solid fa-list" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'
                                }`}
                        >
                            <i className="fa-solid fa-grid-2" />
                        </button>
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-primary"
                    >
                        <i className="fa-solid fa-plus mr-2" />
                        Tạo OKR
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard
                    label="Tổng mục tiêu"
                    value={stats.total}
                    icon="fa-bullseye"
                    color="bg-indigo-500"
                />
                <StatCard
                    label="Đúng tiến độ"
                    value={stats.onTrack}
                    icon="fa-check-circle"
                    color="bg-green-500"
                />
                <StatCard
                    label="Có rủi ro"
                    value={stats.atRisk}
                    icon="fa-exclamation-triangle"
                    color="bg-yellow-500"
                />
                <StatCard
                    label="Tiến độ TB"
                    value={`${stats.avgProgress}%`}
                    icon="fa-chart-line"
                    color="bg-purple-500"
                />
            </div>

            {/* Company OKR Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800">
                        <i className="fa-solid fa-building text-indigo-500 mr-2" />
                        Tiến độ Workspace
                    </h2>
                    <span className="text-sm text-gray-500">{selectedPeriod}</span>
                </div>
                <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${stats.avgProgress}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                    <span className="text-gray-500">{stats.avgProgress}% hoàn thành</span>
                    <span className="text-gray-500">{stats.total} mục tiêu</span>
                </div>
            </div>

            {/* Objectives List */}
            <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 gap-4' : 'space-y-4'}>
                {objectives.length === 0 && !isLoading ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center col-span-2">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-bullseye text-2xl text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Chưa có OKR nào</h3>
                        <p className="text-gray-500 mb-4">Bắt đầu bằng cách tạo mục tiêu đầu tiên</p>
                        <button onClick={() => setShowModal(true)} className="btn-primary">
                            <i className="fa-solid fa-plus mr-2" /> Tạo OKR
                        </button>
                    </div>
                ) : objectives.map(objective => (
                    <ObjectiveCard key={objective.id} objective={objective} viewMode={viewMode} />
                ))}
            </div>

            {/* Create OKR Modal */}
            {showModal && <OKRFormModal onClose={() => setShowModal(false)} onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />}
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

function ObjectiveCard({ objective, viewMode }) {
    const [expanded, setExpanded] = useState(false);
    const status = STATUS_CONFIG[objective.status] || STATUS_CONFIG.IN_PROGRESS;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            {/* Header */}
            <div
                className="p-5 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{objective.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>
                                <i className="fa-solid fa-user mr-1" />
                                {objective.owner?.fullName || 'N/A'}
                            </span>
                            <span>
                                <i className="fa-solid fa-calendar mr-1" />
                                {objective.period}
                            </span>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <i className={`fa-solid ${status.icon} mr-1`} />
                        {status.label}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${objective.progress >= 70 ? 'bg-green-500' :
                            objective.progress >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                        style={{ width: `${objective.progress || 0}%` }}
                    />
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">{objective.progress || 0}% hoàn thành</span>
                    <span className="text-gray-400">
                        {objective.keyResults?.length || 0} Key Results
                        <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'} ml-2`} />
                    </span>
                </div>
            </div>

            {/* Key Results (Expanded) */}
            {expanded && (
                <div className="border-t border-gray-100 bg-gray-50/50 p-5 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-600 mb-3">Key Results</h4>
                    {objective.keyResults?.map((kr, idx) => (
                        <KeyResultItem key={kr.id || idx} keyResult={kr} />
                    ))}
                </div>
            )}
        </div>
    );
}

function KeyResultItem({ keyResult }) {
    const progress = Math.min(100, Math.round(((keyResult.current || 0) / (keyResult.target || 1)) * 100));

    return (
        <div className="bg-white rounded-lg p-3 border border-gray-100">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-700">{keyResult.title}</span>
                <span className="text-sm font-medium text-gray-900">
                    {keyResult.current}/{keyResult.target} {keyResult.unit}
                </span>
            </div>
            <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`absolute left-0 top-0 h-full rounded-full ${progress >= 100 ? 'bg-green-500' :
                        progress >= 70 ? 'bg-blue-500' :
                            progress >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

function OKRFormModal({ onClose, objective, onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        title: objective?.title || '',
        description: objective?.description || '',
        period: objective?.period || 'Q1-2024',
        keyResults: objective?.keyResults || [{ title: '', target: '', unit: '' }],
    });

    const handleAddKeyResult = () => {
        setFormData(prev => ({
            ...prev,
            keyResults: [...prev.keyResults, { title: '', target: '', unit: '' }]
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">
                                {objective ? 'Chỉnh sửa OKR' : 'Tạo OKR mới'}
                            </h2>
                            <p className="text-sm text-gray-500">Định nghĩa mục tiêu và kết quả then chốt</p>
                        </div>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <i className="fa-solid fa-xmark text-xl" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto">
                        {/* Objective */}
                        <div className="bg-indigo-50 rounded-xl p-4">
                            <h3 className="font-semibold text-indigo-900 mb-3">
                                <i className="fa-solid fa-bullseye mr-2" /> Mục tiêu (Objective)
                            </h3>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="input w-full mb-3"
                                placeholder="VD: Tăng trưởng doanh thu 30%"
                                required
                            />
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="input w-full"
                                rows="2"
                                placeholder="Mô tả chi tiết mục tiêu..."
                            />
                        </div>

                        {/* Period */}
                        <div>
                            <label className="label">Kỳ theo dõi</label>
                            <select
                                value={formData.period}
                                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                                className="input w-full"
                            >
                                <option value="Q1-2024">Q1-2024</option>
                                <option value="Q2-2024">Q2-2024</option>
                                <option value="Q3-2024">Q3-2024</option>
                                <option value="Q4-2024">Q4-2024</option>
                                <option value="2024">Năm 2024</option>
                            </select>
                        </div>

                        {/* Key Results */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-gray-700">
                                    <i className="fa-solid fa-key text-purple-500 mr-2" /> Key Results
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleAddKeyResult}
                                    className="text-sm text-indigo-600 hover:text-indigo-800"
                                >
                                    <i className="fa-solid fa-plus mr-1" /> Thêm KR
                                </button>
                            </div>
                            <div className="space-y-3">
                                {formData.keyResults.map((kr, index) => (
                                    <div key={index} className="flex gap-3 items-start">
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-semibold text-sm">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 grid grid-cols-3 gap-2">
                                            <input
                                                type="text"
                                                value={kr.title}
                                                onChange={(e) => {
                                                    const newKRs = [...formData.keyResults];
                                                    newKRs[index].title = e.target.value;
                                                    setFormData({ ...formData, keyResults: newKRs });
                                                }}
                                                className="input col-span-2"
                                                placeholder="Kết quả cần đạt"
                                            />
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={kr.target}
                                                    onChange={(e) => {
                                                        const newKRs = [...formData.keyResults];
                                                        newKRs[index].target = e.target.value;
                                                        setFormData({ ...formData, keyResults: newKRs });
                                                    }}
                                                    className="input w-20"
                                                    placeholder="Mục tiêu"
                                                />
                                                <input
                                                    type="text"
                                                    value={kr.unit}
                                                    onChange={(e) => {
                                                        const newKRs = [...formData.keyResults];
                                                        newKRs[index].unit = e.target.value;
                                                        setFormData({ ...formData, keyResults: newKRs });
                                                    }}
                                                    className="input w-16"
                                                    placeholder="%"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                        <button type="button" onClick={onClose} className="btn-ghost" disabled={isLoading}>
                            Hủy
                        </button>
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? <i className="fa-solid fa-spinner fa-spin mr-2" /> : <i className="fa-solid fa-check mr-2" />}
                            Lưu OKR
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

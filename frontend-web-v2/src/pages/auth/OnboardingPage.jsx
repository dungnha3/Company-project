import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

const TABS = [
    { id: 'create', label: 'Tạo Workspace', icon: 'fa-plus' },
    { id: 'join', label: 'Gia nhập bằng ID', icon: 'fa-door-open' },
    { id: 'invites', label: 'Lời mời', icon: 'fa-envelope' },
];

export default function OnboardingPage() {
    const navigate = useNavigate();
    const { fetchWorkspaces, selectWorkspace, workspaces, hasFetched, currentWorkspace } = useWorkspaceStore();
    const toast = useToast();

    const [activeTab, setActiveTab] = useState('create');
    const [loading, setLoading] = useState(false);

    // Auto-redirect to app if user already has workspaces
    useEffect(() => {
        if (!hasFetched) {
            fetchWorkspaces();
        }
    }, [hasFetched, fetchWorkspaces]);

    useEffect(() => {
        if (hasFetched && workspaces.length > 0 && currentWorkspace) {
            navigate('/app', { replace: true });
        }
    }, [hasFetched, workspaces, currentWorkspace, navigate]);

    // Tab: Tạo mới
    const [workspaceName, setWorkspaceName] = useState('');

    // Tab: Gia nhập
    const [workspaceId, setWorkspaceId] = useState('');
    const [joinSent, setJoinSent] = useState(false);

    // Tab: Lời mời
    const [invites, setInvites] = useState([]);
    const [invitesLoading, setInvitesLoading] = useState(false);

    // Load lời mời khi chuyển sang tab invites
    useEffect(() => {
        if (activeTab === 'invites') loadInvites();
    }, [activeTab]);

    const loadInvites = async () => {
        setInvitesLoading(true);
        try {
            const res = await apiClient.get(ENDPOINTS.INVITES.PENDING);
            setInvites(res.data || []);
        } catch {
            setInvites([]);
        } finally {
            setInvitesLoading(false);
        }
    };

    // Tạo Workspace mới
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!workspaceName.trim()) return;
        setLoading(true);
        try {
            const res = await apiClient.post(ENDPOINTS.COMPANIES.CREATE, { name: workspaceName.trim() });
            if (res.data) {
                toast.success('Tạo Workspace thành công!');
                await fetchWorkspaces();
                await useWorkspaceStore.getState().switchToCompany(res.data.companyId || res.data.id);
                navigate('/app', { replace: true });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    // Xin gia nhập bằng Workspace ID
    const handleJoin = async (e) => {
        e.preventDefault();
        const id = parseInt(workspaceId, 10);
        if (!id || isNaN(id)) {
            toast.error('Vui lòng nhập Workspace ID hợp lệ (là số)');
            return;
        }
        setLoading(true);
        try {
            const res = await apiClient.post(ENDPOINTS.WORKSPACE_JOIN.REQUEST, { companyId: id });
            toast.success(res.data?.message || 'Đã gửi yêu cầu gia nhập!');
            setJoinSent(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    // Chấp nhận lời mời
    const handleAcceptInvite = async (inviteId, companyId, companyName) => {
        setLoading(true);
        try {
            await apiClient.post(ENDPOINTS.INVITES.ACCEPT, { inviteId });
            toast.success(`Đã gia nhập Workspace "${companyName}"!`);
            await fetchWorkspaces();
            await useWorkspaceStore.getState().switchToCompany(companyId);
            navigate('/app', { replace: true });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    // Từ chối lời mời
    const handleDeclineInvite = async (inviteId) => {
        try {
            await apiClient.delete(ENDPOINTS.INVITES.CANCEL(inviteId));
            setInvites(prev => prev.filter(i => i.inviteId !== inviteId));
            toast.info('Đã từ chối lời mời');
        } catch (err) {
            toast.error('Có lỗi xảy ra');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl shadow-lg shadow-indigo-200">
                        <i className="fa-solid fa-layer-group" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Bắt đầu với Workspace</h1>
                    <p className="text-gray-500 mt-1 text-sm">Tạo hoặc tham gia một không gian làm việc để tiếp tục</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-3.5 text-sm font-medium flex items-center justify-center gap-2 transition-all border-b-2 ${
                                    activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <i className={`fa-solid ${tab.icon} text-xs`} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="p-7">
                        {/* ===== Tab: Tạo Workspace ===== */}
                        {activeTab === 'create' && (
                            <form onSubmit={handleCreate} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tên Workspace <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={workspaceName}
                                        onChange={e => setWorkspaceName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                                        placeholder="Ví dụ: Công ty ABC, Team Alpha..."
                                        autoFocus
                                    />
                                    <p className="text-xs text-gray-400 mt-1.5">
                                        Bạn sẽ là Chủ sở hữu (Owner) của Workspace này.
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !workspaceName.trim()}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <><i className="fa-solid fa-spinner fa-spin" /> Đang tạo...</>
                                    ) : (
                                        <><i className="fa-solid fa-plus" /> Tạo Workspace</>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* ===== Tab: Gia nhập bằng ID ===== */}
                        {activeTab === 'join' && (
                            <>
                                {joinSent ? (
                                    <div className="text-center py-6">
                                        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <i className="fa-solid fa-check text-green-600 text-2xl" />
                                        </div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Đã gửi yêu cầu!</h3>
                                        <p className="text-sm text-gray-500 mb-5">
                                            Yêu cầu của bạn đang chờ Admin phê duyệt. Bạn sẽ nhận được thông báo khi được duyệt.
                                        </p>
                                        <button
                                            onClick={() => { setJoinSent(false); setWorkspaceId(''); }}
                                            className="text-indigo-600 text-sm font-medium hover:underline"
                                        >
                                            Gửi yêu cầu khác
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleJoin} className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Workspace ID <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                min={1}
                                                value={workspaceId}
                                                onChange={e => setWorkspaceId(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white text-center text-xl font-mono tracking-widest"
                                                placeholder="Nhập ID (số)"
                                                autoFocus
                                            />
                                            <p className="text-xs text-gray-400 mt-1.5">
                                                Hỏi Admin của Workspace để lấy Workspace ID (là 1 con số).
                                            </p>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading || !workspaceId}
                                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {loading ? (
                                                <><i className="fa-solid fa-spinner fa-spin" /> Đang gửi...</>
                                            ) : (
                                                <><i className="fa-solid fa-paper-plane" /> Gửi yêu cầu gia nhập</>
                                            )}
                                        </button>
                                    </form>
                                )}
                            </>
                        )}

                        {/* ===== Tab: Lời mời ===== */}
                        {activeTab === 'invites' && (
                            <div className="min-h-[160px]">
                                {invitesLoading ? (
                                    <div className="flex justify-center py-10">
                                        <i className="fa-solid fa-spinner fa-spin text-indigo-500 text-2xl" />
                                    </div>
                                ) : invites.length === 0 ? (
                                    <div className="text-center py-10">
                                        <i className="fa-solid fa-inbox text-gray-300 text-4xl mb-3" />
                                        <p className="text-gray-500 text-sm">Bạn chưa có lời mời nào</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {invites.map(invite => (
                                            <div
                                                key={invite.inviteId}
                                                className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-indigo-50/40 transition-all"
                                            >
                                                {invite.companyLogo ? (
                                                    <img
                                                        src={invite.companyLogo}
                                                        alt={invite.companyName}
                                                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-indigo-600 font-bold text-sm">
                                                            {invite.companyName?.charAt(0)?.toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm truncate">{invite.companyName}</p>
                                                    <p className="text-xs text-gray-400">Workspace ID: {invite.companyId}</p>
                                                </div>
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleAcceptInvite(invite.inviteId, invite.companyId, invite.companyName)}
                                                        disabled={loading}
                                                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
                                                    >
                                                        Chấp nhận
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeclineInvite(invite.inviteId)}
                                                        className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
                                                    >
                                                        Từ chối
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400 mt-5">
                    Workspace ID của bạn sẽ xuất hiện trong phần <strong>Cài đặt Workspace</strong> sau khi tạo.
                </p>
            </div>
        </div>
    );
}

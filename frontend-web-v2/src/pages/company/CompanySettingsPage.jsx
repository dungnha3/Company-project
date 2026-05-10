import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useAccessControl } from '@shared/hooks/useAccessControl';
import MembersTab from './MembersTab';

export default function CompanySettingsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const toast = useToast();
    const queryClient = useQueryClient();
    const { currentWorkspace } = useWorkspaceStore();
    const { canAccess } = useAccessControl();

    const [activeTab, setActiveTab] = useState(() => {
        const tab = searchParams.get('tab');
        return ['general', 'members', 'requests'].includes(tab) ? tab : 'general';
    });

    const canManageRequests = canAccess({ permission: 'WORKSPACE.MANAGE_REQUESTS' });
    const canManageMembers = canAccess({ permission: 'WORKSPACE.MANAGE_MEMBERS' });

    useEffect(() => {
        if (searchParams.get('drive_connected') === 'true') {
            toast.success('Đã kết nối Google Drive thành công!');
            searchParams.delete('drive_connected');
            setSearchParams(searchParams);
        }
        if (searchParams.get('drive_error') === 'true') {
            toast.error('Lỗi khi kết nối Google Drive. Vui lòng thử lại.');
            searchParams.delete('drive_error');
            setSearchParams(searchParams);
        }
        const tabFromUrl = searchParams.get('tab');
        if (tabFromUrl && ['general', 'members', 'requests'].includes(tabFromUrl)) {
            setActiveTab(tabFromUrl);
        }
    }, [searchParams, setSearchParams, toast]);

    const { data: driveStatus, isLoading: isDriveLoading } = useQuery({
        queryKey: ['driveStatus'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.STORAGE.STATUS);
            return res.data;
        }
    });

    const { data: joinRequests, isLoading: isRequestsLoading } = useQuery({
        queryKey: ['joinRequests', currentWorkspace?.id],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.WORKSPACE_JOIN.PENDING(currentWorkspace?.id));
            return res.data;
        },
        enabled: canManageRequests && !!currentWorkspace?.id,
    });

    const connectDriveMutation = useMutation({
        mutationFn: async () => {
            const res = await apiClient.get(ENDPOINTS.STORAGE.OAUTH_AUTHORIZE);
            return res.data.url;
        },
        onSuccess: (url) => {
            window.location.href = url;
        },
        onError: () => toast.error('Không thể lấy link kết nối Google Drive')
    });

    const disconnectDriveMutation = useMutation({
        mutationFn: async () => await apiClient.delete(ENDPOINTS.STORAGE.DISCONNECT),
        onSuccess: () => {
            toast.success('Đã ngắt kết nối Google Drive');
            queryClient.invalidateQueries(['driveStatus']);
        },
        onError: () => toast.error('Lỗi khi ngắt kết nối')
    });

    const approveRequestMutation = useMutation({
        mutationFn: async (requestId) => await apiClient.post(ENDPOINTS.WORKSPACE_JOIN.APPROVE(requestId)),
        onSuccess: () => {
            toast.success('Đã duyệt yêu cầu tham gia');
            queryClient.invalidateQueries(['joinRequests', currentWorkspace?.id]);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    });

    const rejectRequestMutation = useMutation({
        mutationFn: async (requestId) => await apiClient.post(ENDPOINTS.WORKSPACE_JOIN.REJECT(requestId)),
        onSuccess: () => {
            toast.info('Đã từ chối yêu cầu tham gia');
            queryClient.invalidateQueries(['joinRequests', currentWorkspace?.id]);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    });

    if (isDriveLoading) return <div className="p-6">Đang tải...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cài đặt Workspace</h1>
                    <p className="text-gray-500 mt-1">Quản lý cấu hình và thành viên Workspace: <strong className="text-indigo-600">{currentWorkspace?.name}</strong> (ID: {currentWorkspace?.id})</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'general'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Cài đặt chung
                    </button>
                    {canManageMembers && (
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'members'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Thành viên & Phân quyền
                        </button>
                    )}
                    {canManageRequests && (
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                activeTab === 'requests'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Yêu cầu gia nhập
                            {joinRequests?.length > 0 && (
                                <span className="bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs font-bold">
                                    {joinRequests.length}
                                </span>
                            )}
                        </button>
                    )}
                </nav>
            </div>

            {/* Tab: Cài đặt chung */}
            {activeTab === 'general' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 animate-fade-in">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Lưu trữ Tài liệu (Google Drive)</h2>
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50">
                            <div className="flex items-center gap-4">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Google Drive" className="w-10 h-10" />
                                <div>
                                    <div className="font-semibold text-gray-800">Kết nối Google Drive</div>
                                    <div className="text-sm text-gray-500">
                                        {driveStatus?.connected ? 'Đã kết nối. Tất cả file tải lên sẽ được lưu vào Google Drive.' : 'Chưa kết nối. Không thể tải file lên nếu chưa kết nối.'}
                                    </div>
                                </div>
                            </div>
                            {driveStatus?.connected ? (
                                <button
                                    onClick={() => disconnectDriveMutation.mutate()}
                                    disabled={disconnectDriveMutation.isPending}
                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 disabled:opacity-50"
                                >
                                    {disconnectDriveMutation.isPending ? 'Đang xử lý...' : 'Ngắt kết nối'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => connectDriveMutation.mutate()}
                                    disabled={connectDriveMutation.isPending}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {connectDriveMutation.isPending ? 'Đang chuyển hướng...' : 'Kết nối ngay'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Thành viên */}
            {activeTab === 'members' && canManageMembers && (
                <MembersTab />
            )}

            {/* Tab: Yêu cầu gia nhập */}
            {activeTab === 'requests' && canManageRequests && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Danh sách chờ duyệt</h2>
                    
                    {isRequestsLoading ? (
                        <div className="py-8 flex justify-center"><i className="fa-solid fa-spinner fa-spin text-indigo-500 text-xl" /></div>
                    ) : joinRequests?.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-200">
                                <i className="fa-solid fa-inbox text-gray-400 text-lg" />
                            </div>
                            <p className="text-gray-500 font-medium text-sm">Không có yêu cầu gia nhập nào</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {(joinRequests || []).map(req => (
                                <div key={req.requestId} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {req.avatarUrl ? (
                                            <img src={req.avatarUrl} alt={req.fullName} className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                <span className="text-indigo-600 font-bold text-sm">
                                                    {req.fullName?.charAt(0)?.toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{req.fullName}</p>
                                            <p className="text-xs text-gray-500">{req.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => approveRequestMutation.mutate(req.requestId)}
                                            disabled={approveRequestMutation.isPending || rejectRequestMutation.isPending}
                                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Duyệt
                                        </button>
                                        <button
                                            onClick={() => rejectRequestMutation.mutate(req.requestId)}
                                            disabled={approveRequestMutation.isPending || rejectRequestMutation.isPending}
                                            className="px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
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
    );
}

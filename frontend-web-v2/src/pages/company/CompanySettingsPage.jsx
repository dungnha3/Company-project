import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { useAuthStore } from '@shared/stores/authStore';

export default function CompanySettingsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const toast = useToast();
    const queryClient = useQueryClient();
    const { currentCompany } = useAuthStore();

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
    }, [searchParams, setSearchParams, toast]);

    const { data: driveStatus, isLoading } = useQuery({
        queryKey: ['driveStatus'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.STORAGE.STATUS);
            return res.data;
        }
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

    if (isLoading) return <div className="p-6">Đang tải...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Cài đặt Công ty</h1>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
    );
}

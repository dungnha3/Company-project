import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

export default function CreateRoomModal({ onClose, onSuccess }) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1); // 1: info, 2: members
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'GROUP', // GROUP | DIRECT
        memberIds: [],
    });
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch users for member selection
    const { data: users = [], isLoading: loadingUsers } = useQuery({
        queryKey: ['users-for-chat'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.USERS.LIST)).data?.content || [],
    });

    const createRoomMutation = useMutation({
        mutationFn: async (data) => {
            return (await apiClient.post(ENDPOINTS.CHAT.CREATE_ROOM, data)).data;
        },
        onSuccess: (room) => {
            toast.success('Đã tạo phòng chat mới!');
            queryClient.invalidateQueries(['chat-rooms']);
            onSuccess?.(room);
            onClose();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Không thể tạo phòng chat');
        }
    });

    const filteredUsers = users.filter(u =>
        u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleMember = (userId) => {
        setFormData(prev => ({
            ...prev,
            memberIds: prev.memberIds.includes(userId)
                ? prev.memberIds.filter(id => id !== userId)
                : [...prev.memberIds, userId]
        }));
    };

    const handleSubmit = () => {
        if (!formData.name.trim()) {
            toast.error('Vui lòng nhập tên phòng');
            return;
        }
        if (formData.memberIds.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 thành viên');
            return;
        }
        createRoomMutation.mutate(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <i className="fa-solid fa-comments text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold">Tạo phòng chat</h2>
                            <p className="text-white/70 text-xs">
                                {step === 1 ? 'Bước 1: Thông tin' : 'Bước 2: Thêm thành viên'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center">
                        <i className="fa-solid fa-times" />
                    </button>
                </div>

                {/* Progress */}
                <div className="flex px-6 pt-4">
                    <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-gray-200'}`} />
                    <div className="w-2" />
                    <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`} />
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 1 ? (
                        <div className="space-y-4">
                            {/* Room Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Loại phòng</label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setFormData({ ...formData, type: 'GROUP' })}
                                        className={`flex-1 p-4 rounded-xl border-2 transition-colors ${formData.type === 'GROUP'
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <i className="fa-solid fa-users text-2xl text-blue-500 mb-2" />
                                        <div className="font-medium">Nhóm</div>
                                        <div className="text-xs text-gray-500">Nhiều người</div>
                                    </button>
                                    <button
                                        onClick={() => setFormData({ ...formData, type: 'DIRECT' })}
                                        className={`flex-1 p-4 rounded-xl border-2 transition-colors ${formData.type === 'DIRECT'
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <i className="fa-solid fa-user text-2xl text-purple-500 mb-2" />
                                        <div className="font-medium">Trực tiếp</div>
                                        <div className="text-xs text-gray-500">1-1</div>
                                    </button>
                                </div>
                            </div>

                            {/* Room Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tên phòng *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="VD: Team Frontend"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Mô tả ngắn về phòng chat..."
                                    rows={2}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Search */}
                            <div className="relative">
                                <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm kiếm thành viên..."
                                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Selected Members */}
                            {formData.memberIds.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.memberIds.map(id => {
                                        const user = users.find(u => u.userId === id);
                                        return user ? (
                                            <span
                                                key={id}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                                            >
                                                {user.fullName}
                                                <button onClick={() => toggleMember(id)} className="hover:text-blue-900">
                                                    <i className="fa-solid fa-times text-xs" />
                                                </button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}

                            {/* User List */}
                            <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
                                {loadingUsers ? (
                                    <div className="text-center py-8 text-gray-400">Đang tải...</div>
                                ) : filteredUsers.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">Không tìm thấy</div>
                                ) : (
                                    filteredUsers.map(user => (
                                        <button
                                            key={user.userId}
                                            onClick={() => toggleMember(user.userId)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${formData.memberIds.includes(user.userId)
                                                    ? 'bg-blue-50 border border-blue-200'
                                                    : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                                {user.fullName?.charAt(0) || 'U'}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="font-medium text-gray-900">{user.fullName}</div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.memberIds.includes(user.userId)
                                                    ? 'border-blue-500 bg-blue-500'
                                                    : 'border-gray-300'
                                                }`}>
                                                {formData.memberIds.includes(user.userId) && (
                                                    <i className="fa-solid fa-check text-white text-xs" />
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 flex justify-between">
                    {step === 1 ? (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                                Hủy
                            </button>
                            <button
                                onClick={() => setStep(2)}
                                disabled={!formData.name.trim()}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                            >
                                Tiếp tục
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                                <i className="fa-solid fa-arrow-left mr-2" />
                                Quay lại
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={createRoomMutation.isPending || formData.memberIds.length === 0}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                {createRoomMutation.isPending ? (
                                    <>
                                        <i className="fa-solid fa-spinner fa-spin" />
                                        Đang tạo...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-check" />
                                        Tạo phòng
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

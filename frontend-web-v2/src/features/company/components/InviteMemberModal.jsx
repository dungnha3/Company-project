import { useState } from 'react';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

const ROLE_OPTIONS = [
    { value: 'MEMBER', label: 'Thành viên' },
    { value: 'ADMIN', label: 'Quản trị viên' },
    { value: 'MANAGER_HR', label: 'Quản lý HR' },
    { value: 'MANAGER_PROJECT', label: 'Quản lý dự án' },
    { value: 'MANAGER_ACCOUNTING', label: 'Quản lý kế toán' },
];

export default function InviteMemberModal({ isOpen, onClose, onSuccess }) {
    const { currentWorkspace } = useWorkspaceStore();
    const toast = useToast();

    const [email, setEmail] = useState('');
    const [role, setRole] = useState('MEMBER');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email.trim()) {
            toast.error('Vui lòng nhập email');
            return;
        }

        setLoading(true);
        try {
            await apiClient.post(ENDPOINTS.INVITES.SEND, {
                email: email.trim(),
                role: role,
            });

            toast.success(`Đã gửi lời mời đến ${email}`);
            setEmail('');
            setRole('MEMBER');
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Invite failed:', error);
            toast.error(error.response?.data?.message || 'Không thể gửi lời mời');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                    <h3 className="text-xl font-bold">Mời thành viên</h3>
                    <p className="text-indigo-100 text-sm mt-1">
                        Gửi lời mời đến {currentWorkspace?.name || 'Workspace'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="nguoidung@email.com"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            disabled={loading}
                        />
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Vai trò
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            disabled={loading}
                        >
                            {ROLE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <i className="fa-solid fa-paper-plane" />
                                    Gửi lời mời
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

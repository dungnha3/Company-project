import { useState, useEffect } from 'react';
import { useCompanyStore } from '@shared/stores/companyStore';
import { useAuthStore } from '@shared/stores/authStore';
import ContentLayout from '@layouts/ContentLayout'; // We might need to create this reusable layout wrapper
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

export default function CompanySettingsPage() {
    const { currentCompany, members, fetchMembers, loading } = useCompanyStore();
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    if (!currentCompany) return null;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Cài đặt công ty</h1>
                    <p className="text-gray-500">Quản lý thông tin và thành viên</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex gap-6">
                    <TabButton
                        active={activeTab === 'general'}
                        onClick={() => setActiveTab('general')}
                        icon="fa-building"
                    >
                        Thông tin chung
                    </TabButton>
                    <TabButton
                        active={activeTab === 'members'}
                        onClick={() => setActiveTab('members')}
                        icon="fa-users"
                    >
                        Thành viên ({members.length})
                    </TabButton>
                    <TabButton
                        active={activeTab === 'roles'}
                        onClick={() => setActiveTab('roles')}
                        icon="fa-shield-halved"
                    >
                        Phân quyền
                    </TabButton>
                </div>
            </div>

            {/* Tab Content */}
            <div className="py-4">
                {activeTab === 'general' && <GeneralSettings company={currentCompany} />}
                {activeTab === 'members' && <MembersSettings members={members} loading={loading} />}
                {activeTab === 'roles' && <RolesSettings />}
            </div>
        </div>
    );
}

function TabButton({ children, active, onClick, icon }) {
    return (
        <button
            onClick={onClick}
            className={`pb-3 px-1 flex items-center gap-2 transition-all font-medium text-sm relative
        ${active ? 'text-primary' : 'text-gray-500 hover:text-gray-700'}
      `}
        >
            <i className={`fa-solid ${icon}`} />
            {children}
            {active && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
            )}
        </button>
    );
}

/* Sub-components will be ideally extracted to separate files */

function GeneralSettings({ company }) {
    const [formData, setFormData] = useState({
        name: company.companyName || '',
        email: '', // Need specific endpoint to get details
        phone: '',
        address: '',
        website: '',
    });
    const toast = useToast();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // await apiClient.put(ENDPOINTS.COMPANIES.UPDATE(company.companyId), formData);
            toast.success('Cập nhật thông tin thành công');
        } catch (error) {
            // toast.error...
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Logo Upload Placeholder */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center text-primary text-2xl font-bold">
                        {company.companyName?.charAt(0)}
                    </div>
                    <div>
                        <button type="button" className="btn-secondary text-sm">Thay đổi logo</button>
                        <p className="text-xs text-gray-500 mt-1">Hỗ trợ JPG, PNG tối đa 2MB</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="label">Tên công ty</label>
                        <input type="text" className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Mã số thuế</label>
                        <input type="text" className="input bg-gray-50" disabled value="Wait for API" />
                    </div>
                </div>

                {/* More fields... */}

                <div className="pt-4 flex justify-end">
                    <button type="submit" className="btn-primary" disabled={loading}>
                        Lưu thay đổi
                    </button>
                </div>
            </form>
        </div>
    );
}

function MembersSettings({ members, loading }) {
    const { inviteMember, removeMember } = useCompanyStore();
    const [showInviteModal, setShowInviteModal] = useState(false);
    const toast = useToast();

    const handleRemove = async (userId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi công ty?')) return;

        const success = await removeMember(userId);
        if (success) {
            toast.success('Đã xóa thành viên thành công');
        } else {
            toast.error('Không thể xóa thành viên');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="w-full max-w-sm relative">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Tìm kiếm thành viên..." className="input pl-10 py-2" />
                </div>
                <button onClick={() => setShowInviteModal(true)} className="btn-primary">
                    <i className="fa-solid fa-user-plus" />
                    Mời thành viên
                </button>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="table-container border-0 rounded-none">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Thành viên</th>
                                <th>Email</th>
                                <th>Vai trò</th>
                                <th>Trạng thái</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">Đang tải...</td></tr>
                            ) : members.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">Chưa có thành viên nào</td></tr>
                            ) : (
                                members.map(member => (
                                    <tr key={member.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                                                    {member.username?.charAt(0)}
                                                </div>
                                                <span className="font-medium">{member.username}</span>
                                            </div>
                                        </td>
                                        <td>{member.email}</td>
                                        <td>
                                            <span className={`badge ${member.role === 'OWNER' ? 'badge-danger' : 'badge-info'}`}>
                                                {member.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge badge-success">Active</span>
                                        </td>
                                        <td>
                                            {member.role !== 'OWNER' && (
                                                <button
                                                    onClick={() => handleRemove(member.id)}
                                                    className="w-8 h-8 rounded hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-500 transition-colors"
                                                    title="Xóa thành viên"
                                                >
                                                    <i className="fa-solid fa-trash-can" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invite Modal Placeholder */}
            {/* {showInviteModal && <InviteMemberModal ... />} */}
        </div>
    );
}

function RolesSettings() {
    return (
        <div className="card">
            <div className="empty-state">
                <i className="fa-solid fa-shield-halved" />
                <div>Tính năng quản lý Role & Permission đang được phát triển</div>
            </div>
        </div>
    );
}

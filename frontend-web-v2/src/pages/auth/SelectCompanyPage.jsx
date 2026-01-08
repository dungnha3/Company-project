import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useCompanyStore } from '@shared/stores/companyStore';
import CreateCompanyModal from '../../features/company/components/CreateCompanyModal';

export default function SelectCompanyPage() {
    const navigate = useNavigate();
    const { companies, selectCompany, loading } = useCompanyStore();
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleSelect = async (companyId) => {
        const success = await selectCompany(companyId);
        if (success) {
            navigate('/app', { replace: true });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="card-glass w-full max-w-lg p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto bg-primary rounded-2xl flex items-center justify-center mb-4">
                        <i className="fa-solid fa-building-user text-white text-2xl" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Chọn công ty</h1>
                    <p className="text-gray-500 mt-1">Chọn không gian làm việc để tiếp tục</p>
                </div>

                {/* Company List */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                    {companies.length === 0 && (
                        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200 mb-3">
                            <p>Bạn chưa tham gia công ty nào.</p>
                            <p className="text-xs mt-1">Hãy tạo công ty mới để bắt đầu.</p>
                        </div>
                    )}

                    {companies.map((company) => (
                        <button
                            key={company.companyId}
                            onClick={() => handleSelect(company.companyId)}
                            disabled={loading}
                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 
                       hover:border-primary hover:bg-primary-50 transition-all text-left group bg-white/50"
                        >
                            {/* Company Avatar */}
                            <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-primary 
                            flex items-center justify-center transition-colors">
                                <span className="text-lg font-bold text-gray-500 group-hover:text-white">
                                    {company.companyName?.charAt(0) || 'C'}
                                </span>
                            </div>

                            {/* Company Info */}
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-800 truncate">{company.companyName}</div>
                                <div className="text-sm text-gray-500">
                                    Vai trò: <span className="text-primary font-medium">{company.role}</span>
                                </div>
                            </div>

                            {/* Arrow */}
                            <i className="fa-solid fa-chevron-right text-gray-300 group-hover:text-primary" />
                        </button>
                    ))}

                    {/* Create New Button */}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-300 
                                 hover:border-primary hover:text-primary text-gray-500 transition-all font-medium"
                    >
                        <i className="fa-solid fa-plus" />
                        Tạo công ty mới
                    </button>
                </div>

                {/* Note */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    <i className="fa-solid fa-info-circle mr-1" />
                    Bạn có thể chuyển đổi giữa các công ty bất kỳ lúc nào
                </p>
            </div>

            {/* Modals */}
            {showCreateModal && (
                <CreateCompanyModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        // Optional: Navigate to new company immediately if needed
                        // For now, reloading page handling inside modal is enough
                    }}
                />
            )}
        </div>
    );
}

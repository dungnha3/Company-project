import { useNavigate } from 'react-router-dom';
import { useCompanyStore } from '@shared/stores/companyStore';

export default function SelectCompanyPage() {
    const navigate = useNavigate();
    const { companies, selectCompany, loading } = useCompanyStore();

    const handleSelect = async (companyId) => {
        const success = await selectCompany(companyId);
        if (success) {
            navigate('/', { replace: true });
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
                    <p className="text-gray-500 mt-1">Bạn là thành viên của nhiều công ty</p>
                </div>

                {/* Company List */}
                <div className="space-y-3">
                    {companies.map((company) => (
                        <button
                            key={company.companyId}
                            onClick={() => handleSelect(company.companyId)}
                            disabled={loading}
                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 
                       hover:border-primary hover:bg-primary-50 transition-all text-left group"
                        >
                            {/* Company Avatar */}
                            <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-primary 
                            flex items-center justify-center transition-colors">
                                <span className="text-lg font-bold text-gray-500 group-hover:text-white">
                                    {company.companyName?.charAt(0)}
                                </span>
                            </div>

                            {/* Company Info */}
                            <div className="flex-1">
                                <div className="font-semibold text-gray-800">{company.companyName}</div>
                                <div className="text-sm text-gray-500">
                                    Vai trò: <span className="text-primary font-medium">{company.role}</span>
                                </div>
                            </div>

                            {/* Arrow */}
                            <i className="fa-solid fa-chevron-right text-gray-300 group-hover:text-primary" />
                        </button>
                    ))}
                </div>

                {/* Note */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    <i className="fa-solid fa-info-circle mr-1" />
                    Bạn có thể chuyển công ty sau trong menu
                </p>
            </div>
        </div>
    );
}

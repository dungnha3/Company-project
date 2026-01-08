import { Navigate } from 'react-router-dom';
import { useCompanyStore } from '@shared/stores/companyStore';

export function CompanyGuard({ children }) {
    const { currentCompany, companies } = useCompanyStore();

    // If user has companies but none selected, redirect to selection
    if (companies.length > 0 && !currentCompany) {
        return <Navigate to="/select-company" replace />;
    }

    // If user has no companies at all, show error or redirect
    if (companies.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="card text-center max-w-md">
                    <i className="fa-solid fa-building-circle-xmark text-4xl text-gray-400 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Chưa thuộc công ty nào</h2>
                    <p className="text-gray-500 mb-4">
                        Bạn chưa được mời vào công ty nào. Vui lòng liên hệ quản trị viên.
                    </p>
                </div>
            </div>
        );
    }

    return children;
}

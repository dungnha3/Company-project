import { useState } from 'react';
import { useCompanyStore } from '@shared/stores/companyStore';

export default function CompanySwitcher({ collapsed }) {
    const [isOpen, setIsOpen] = useState(false);
    const { companies, currentCompany, selectCompany } = useCompanyStore();

    const handleSelect = async (companyId) => {
        await selectCompany(companyId);
        setIsOpen(false);
    };

    if (collapsed) {
        return (
            <div
                className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center cursor-pointer"
                title={currentCompany?.companyName}
            >
                <span className="text-primary font-bold">
                    {currentCompany?.companyName?.charAt(0) || 'C'}
                </span>
            </div>
        );
    }

    return (
        <div className="company-switcher">
            <div
                className="company-switcher-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold">
                    {currentCompany?.companyName?.charAt(0) || 'C'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate">
                        {currentCompany?.companyName || 'Chọn công ty'}
                    </div>
                    <div className="text-xs text-gray-500">{currentCompany?.role || ''}</div>
                </div>
                {companies.length > 1 && (
                    <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-gray-400`} />
                )}
            </div>

            {isOpen && companies.length > 1 && (
                <div className="company-switcher-dropdown">
                    {companies.map(company => (
                        <div
                            key={company.companyId}
                            className={`company-item ${company.companyId === currentCompany?.companyId ? 'active' : ''}`}
                            onClick={() => handleSelect(company.companyId)}
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-semibold text-sm">
                                {company.companyName?.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <div className="font-medium">{company.companyName}</div>
                                <div className="text-xs text-gray-500">{company.role}</div>
                            </div>
                            {company.companyId === currentCompany?.companyId && (
                                <i className="fa-solid fa-check text-primary" />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

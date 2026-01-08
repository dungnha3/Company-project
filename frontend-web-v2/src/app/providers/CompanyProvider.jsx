import { createContext, useContext } from 'react';
import { useCompanyStore } from '@shared/stores/companyStore';

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
    const store = useCompanyStore();

    return (
        <CompanyContext.Provider value={store}>
            {children}
        </CompanyContext.Provider>
    );
}

export function useCompany() {
    const context = useContext(CompanyContext);
    if (!context) {
        throw new Error('useCompany must be used within CompanyProvider');
    }
    return context;
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

export const useCompanyStore = create(
    persist(
        (set, get) => ({
            // State
            companies: [],         // User's company memberships
            currentCompany: null,  // Currently selected company
            currentRole: null,     // User's role in current company
            loading: false,

            // Actions
            setCompanies: (companies) => {
                set({ companies });

                // Auto-select if only one company
                if (companies.length === 1) {
                    get().selectCompany(companies[0].companyId);
                }
            },

            selectCompany: async (companyId) => {
                const company = get().companies.find(c => c.companyId === companyId);
                if (!company) return false;

                set({ loading: true });

                try {
                    // Notify backend about company selection
                    await apiClient.post(ENDPOINTS.AUTH.SELECT_COMPANY, { companyId });

                    set({
                        currentCompany: company,
                        currentRole: company.role,
                        loading: false,
                    });

                    return true;
                } catch (error) {
                    console.error('Failed to select company:', error);
                    set({ loading: false });
                    return false;
                }
            },

            clearCompany: () => {
                set({
                    companies: [],
                    currentCompany: null,
                    currentRole: null,
                });
            },

            // Computed
            hasMultipleCompanies: () => get().companies.length > 1,
            needsCompanySelection: () => get().companies.length > 1 && !get().currentCompany,

            // Permissions helpers
            hasRole: (role) => {
                const currentRole = get().currentRole;
                if (!currentRole) return false;

                const roleHierarchy = ['OWNER', 'ADMIN', 'MANAGER_HR', 'MANAGER_ACCOUNTING', 'MANAGER_PROJECT', 'MEMBER'];
                const currentIndex = roleHierarchy.indexOf(currentRole);
                const requiredIndex = roleHierarchy.indexOf(role);

                return currentIndex !== -1 && currentIndex <= requiredIndex;
            },

            hasAnyRole: (roles) => {
                return roles.some(role => get().currentRole === role);
            },
        }),
        {
            name: 'company-storage',
            partialize: (state) => ({
                companies: state.companies,
                currentCompany: state.currentCompany,
                currentRole: state.currentRole,
            }),
        }
    )
);

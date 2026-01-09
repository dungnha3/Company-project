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
            members: [],           // Members list of current company
            loading: false,
            error: null,

            // Actions
            setCompanies: (companies) => {
                set({ companies });

                // Auto-select if only one company
                if (companies.length === 1 && !get().currentCompany) {
                    get().selectCompany(companies[0].companyId);
                }
            },

            fetchCompanies: async () => {
                set({ loading: true, error: null });
                try {
                    const response = await apiClient.get(ENDPOINTS.COMPANIES.LIST);
                    set({ companies: response.data, loading: false });
                    return response.data;
                } catch (error) {
                    console.error('Failed to fetch companies:', error);
                    set({ loading: false, error: error.message });
                    return [];
                }
            },

            createCompany: async (data) => {
                set({ loading: true, error: null });
                try {
                    const response = await apiClient.post(ENDPOINTS.COMPANIES.CREATE, data);
                    // Refresh list to include new company
                    await get().fetchCompanies();
                    return response.data;
                } catch (error) {
                    console.error('Failed to create company:', error);
                    set({ loading: false, error: error.message });
                    throw error; // Re-throw so component knows it failed
                }
            },

            selectCompany: async (companyId) => {
                const company = get().companies.find(c => c.companyId === companyId);
                if (!company) return false;

                set({ loading: true, error: null });

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
                    set({ loading: false, error: error.message });
                    return false;
                }
            },

            fetchMembers: async () => {
                const { currentCompany } = get();
                if (!currentCompany) return;

                set({ loading: true, error: null });
                try {
                    // BE uses /api/users endpoint with X-Company-Id header to filter members
                    const response = await apiClient.get(ENDPOINTS.USERS.LIST);
                    set({ members: response.data, loading: false });
                } catch (error) {
                    console.error('Failed to fetch members:', error);
                    set({ loading: false, error: error.message });
                }
            },

            inviteMember: async (email, role) => {
                set({ loading: true, error: null });
                try {
                    await apiClient.post(ENDPOINTS.INVITES.SEND, { email, role });
                    set({ loading: false });
                    return { success: true };
                } catch (error) {
                    set({ loading: false, error: error.message });
                    return { success: false, error: error.response?.data?.message || 'Failed to invite' };
                }
            },

            removeMember: async (userId) => {
                set({ loading: true });
                try {
                    await apiClient.delete(ENDPOINTS.USERS.BY_ID(userId));

                    // Optimistic update
                    set(state => ({
                        members: state.members.filter(m => m.id !== userId),
                        loading: false
                    }));
                    return true;
                } catch (error) {
                    set({ loading: false, error: error.message });
                    return false;
                }
            },

            clearCompany: () => {
                set({
                    companies: [],
                    currentCompany: null,
                    currentRole: null,
                    members: [],
                    error: null
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

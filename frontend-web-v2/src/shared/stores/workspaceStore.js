import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

/**
 * Workspace Store - Quản lý context Personal/Company Workspace
 * 
 * Dual Workspace Model:
 * - Personal Workspace: Không gian cá nhân, plan riêng
 * - Company Workspace: Không gian công ty, plan và quyền do công ty quyết định
 */
export const useWorkspaceStore = create(
    persist(
        (set, get) => ({
            // State
            workspaces: [],           // All workspaces (personal + companies)
            currentWorkspace: null,   // Currently active workspace
            workspaceType: 'PERSONAL', // 'PERSONAL' | 'COMPANY'
            personalWorkspace: null,  // User's personal workspace info
            loading: false,
            error: null,

            // Actions
            setWorkspaces: (workspaces) => set({ workspaces }),

            setPersonalWorkspace: (personalWorkspace) => set({ personalWorkspace }),

            fetchWorkspaces: async () => {
                set({ loading: true, error: null });
                try {
                    const response = await apiClient.get(ENDPOINTS.WORKSPACES.LIST);
                    set({ workspaces: response.data, loading: false });

                    // Auto-select personal workspace if none selected
                    const { currentWorkspace } = get();
                    if (!currentWorkspace && response.data.length > 0) {
                        const personal = response.data.find(w => w.type === 'PERSONAL');
                        if (personal) {
                            get().selectWorkspace(personal);
                        }
                    }
                    return response.data;
                } catch (error) {
                    console.error('Failed to fetch workspaces:', error);
                    set({ loading: false, error: error.message });
                    return [];
                }
            },

            selectWorkspace: (workspace) => {
                set({
                    currentWorkspace: workspace,
                    workspaceType: workspace.type,
                });
            },

            switchToPersonal: () => {
                const { personalWorkspace } = get();
                if (personalWorkspace) {
                    set({
                        currentWorkspace: {
                            id: personalWorkspace.workspaceId,
                            name: personalWorkspace.name,
                            type: 'PERSONAL',
                            plan: personalWorkspace.plan,
                            role: 'OWNER'
                        },
                        workspaceType: 'PERSONAL',
                    });
                }
            },

            switchToCompany: async (companyId) => {
                const company = get().workspaces.find(
                    w => w.type === 'COMPANY' && w.id === companyId
                );
                if (company) {
                    // Fetch company settings
                    let settings = null;
                    try {
                        const res = await apiClient.get(ENDPOINTS.COMPANIES.SETTINGS(companyId));
                        settings = res.data;
                    } catch (error) {
                        console.warn('Failed to fetch company settings:', error);
                    }

                    set({
                        currentWorkspace: {
                            ...company,
                            settings, // Attach settings to workspace
                        },
                        workspaceType: 'COMPANY',
                    });
                }
            },

            clearWorkspace: () => {
                set({
                    workspaces: [],
                    currentWorkspace: null,
                    workspaceType: 'PERSONAL',
                    personalWorkspace: null,
                    error: null
                });
            },

            // Computed helpers
            isPersonalContext: () => get().workspaceType === 'PERSONAL',
            isCompanyContext: () => get().workspaceType === 'COMPANY',
            getCurrentCompanyId: () => {
                const { currentWorkspace, workspaceType } = get();
                return workspaceType === 'COMPANY' ? currentWorkspace?.id : null;
            },

            // Role check helper - for Company Admin permissions (not System Admin)
            hasRole: (...allowedRoles) => {
                const { currentWorkspace } = get();
                const currentRole = currentWorkspace?.role || 'MEMBER';
                return allowedRoles.includes(currentRole);
            },

            // Current role getter
            getCurrentRole: () => {
                const { currentWorkspace } = get();
                return currentWorkspace?.role || 'MEMBER';
            },
        }),
        {
            name: 'workspace-storage',
            partialize: (state) => ({
                currentWorkspace: state.currentWorkspace,
                workspaceType: state.workspaceType,
                personalWorkspace: state.personalWorkspace,
            }),
        }
    )
);

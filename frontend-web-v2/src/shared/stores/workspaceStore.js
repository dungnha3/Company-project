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
                            roles: ['OWNER'], // Personal workspace always OWNER
                            permissions: null, // Full access (implicit)
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

                    // Convert single role to array if needed (backward compatibility)
                    const roles = company.roles || (company.role ? [company.role] : []);

                    set({
                        currentWorkspace: {
                            ...company,
                            settings, // Attach settings to workspace
                            roles: roles,
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

            // Role check helper
            hasRole: (...allowedRoles) => {
                const { currentWorkspace } = get();
                // Check against roles array
                const userRoles = currentWorkspace?.roles || (currentWorkspace?.role ? [currentWorkspace.role] : ['MEMBER']);
                return allowedRoles.some(role => userRoles.includes(role));
            },

            // Permission check helper
            hasPermission: (permissionKey) => {
                const { currentWorkspace } = get();
                if (!currentWorkspace || get().workspaceType === 'PERSONAL') return true; // Safe default for Personal

                // Owner/Admin bypass
                const userRoles = currentWorkspace?.roles || (currentWorkspace?.role ? [currentWorkspace.role] : []);
                if (userRoles.includes('OWNER') || userRoles.includes('ADMIN')) return true;

                // Check user permissions object
                const perms = currentWorkspace.permissions;
                if (!perms) return false; // No perms object = no access (unless owner/admin)

                // Simple mapping for now, can be expanded or delegated to featureHelper
                // But featureHelper needs access to perms.
                // We will return the RAW logic here for direct usage, but featureHelper is preferred for "Chain of Logic"
                return !!perms[permissionKey];
            },

            // Current role getter (primary)
            getCurrentRole: () => {
                const { currentWorkspace } = get();
                const roles = currentWorkspace?.roles || (currentWorkspace?.role ? [currentWorkspace.role] : ['MEMBER']);
                return roles[0]; // Return primary role
            },
        }),
        {
            name: 'workspace-storage',
            partialize: (state) => ({
                currentWorkspace: state.currentWorkspace,
                workspaceType: state.workspaceType,
                personalWorkspace: state.personalWorkspace,
            }),
            // [FIX] Re-fetch settings AND roles when store is rehydrated from localStorage
            onRehydrateStorage: () => (state, error) => {
                if (error) {
                    console.error('Failed to rehydrate workspace store:', error);
                    return;
                }
                // Skip rehydration if user is not authenticated (e.g., after logout)
                const token = localStorage.getItem('token');
                if (!token) return;

                if (state?.currentWorkspace?.type === 'COMPANY' && state?.currentWorkspace?.id) {
                    const companyId = state.currentWorkspace.id;
                    import('@shared/api/client').then(({ default: apiClient }) => {
                        import('@shared/api/endpoints').then(({ ENDPOINTS }) => {
                            // Fetch BOTH settings and workspaces to get fresh roles
                            Promise.all([
                                apiClient.get(ENDPOINTS.COMPANIES.SETTINGS(companyId)),
                                apiClient.get(ENDPOINTS.WORKSPACES.LIST)
                            ])
                                .then(([settingsRes, workspacesRes]) => {
                                    const freshCompany = workspacesRes.data.find(
                                        w => w.type === 'COMPANY' && w.id === companyId
                                    );
                                    const freshRoles = freshCompany?.roles || state.currentWorkspace.roles || ['EMPLOYEE'];

                                    useWorkspaceStore.setState((prev) => ({
                                        workspaces: workspacesRes.data,
                                        currentWorkspace: {
                                            ...prev.currentWorkspace,
                                            settings: settingsRes.data,
                                            roles: freshRoles,
                                        }
                                    }));
                                    console.log('✅ Re-fetched company settings and roles on rehydrate:', freshRoles);
                                })
                                .catch(err => console.warn('Failed to re-fetch on rehydrate:', err));
                        });
                    });
                }
            },
        }
    )
);

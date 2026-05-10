import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';



export const useWorkspaceStore = create(
    persist(
        (set, get) => ({
            // State
            workspaces: [],           // All companies user belongs to
            currentWorkspace: null,   // Currently active company
            workspaceType: 'COMPANY', // Always 'COMPANY' now
            loading: false,
            hasFetched: false,
            error: null,
            isHydrated: false,

            // Actions
            setWorkspaces: (workspaces) => set({ workspaces }),

            fetchWorkspaces: async () => {
                // Guard: skip if not authenticated
                const token = localStorage.getItem('accessToken');
                if (!token) return [];

                set({ loading: true, error: null, hasFetched: false });
                try {
                    const response = await apiClient.get(ENDPOINTS.COMPANIES.LIST);
                    const companies = response.data;

                    if (!Array.isArray(companies)) {
                        console.warn('[workspaceStore] /api/companies/my returned non-array:', companies);
                        set({ loading: false, hasFetched: true, workspaces: [] });
                        return [];
                    }

                    // Force type to 'COMPANY' for all items
                    const normalizedCompanies = companies.map(c => ({...c, type: 'COMPANY'}));

                    // Set workspaces first so switchToCompany can find it
                    set({ workspaces: normalizedCompanies });

                    if (normalizedCompanies.length === 0) {
                        // No companies → redirect to onboarding
                        console.debug('[workspaceStore] No companies found');
                        set({ loading: false, hasFetched: true });
                        return [];
                    }

                    // Auto-select first company directly (avoid ID mismatch issues)
                    const firstCompany = normalizedCompanies[0];
                    const targetId = firstCompany.companyId || firstCompany.id;
                    const roles = firstCompany.roles || (firstCompany.role ? [firstCompany.role] : ['EMPLOYEE']);

                    set({
                        currentWorkspace: {
                            ...firstCompany,
                            settings: null,
                            roles: roles,
                        },
                        workspaceType: 'COMPANY',
                    });

                    // Fetch company settings in background
                    apiClient.get(ENDPOINTS.COMPANIES.SETTINGS(targetId), {
                        headers: {
                            'X-Company-Id': targetId,
                            'X-Workspace-Type': 'COMPANY',
                        }
                    }).then(res => {
                        set((prev) => ({
                            currentWorkspace: {
                                ...prev.currentWorkspace,
                                settings: res.data,
                            },
                        }));
                    }).catch(err => {
                        console.warn('[workspaceStore] Failed to fetch settings:', err);
                    });

                    set({ loading: false, hasFetched: true });
                    console.debug('[workspaceStore] fetchWorkspaces complete', {
                        count: normalizedCompanies.length,
                        selected: get().currentWorkspace?.companyId || get().currentWorkspace?.id,
                    });
                    return normalizedCompanies;
                } catch (error) {
                    console.error('[workspaceStore] fetchWorkspaces failed:', error);
                    if (error.response?.status === 401 || error.response?.status === 403) {
                        localStorage.removeItem('accessToken');
                        window.location.assign('/login');
                        return [];
                    }
                    set({ loading: false, error: error.message, hasFetched: true });
                    return [];
                }
            },

            selectWorkspace: (workspace) => {
                set({
                    currentWorkspace: workspace,
                    workspaceType: 'COMPANY',
                });
            },

            switchToCompany: async (companyId) => {
                const company = get().workspaces.find(w => (w.companyId || w.id) === companyId);
                if (company) {
                    // Convert single role to array if needed (backward compatibility)
                    const roles = company.roles || (company.role ? [company.role] : []);

                    // Set workspace state FIRST so localStorage is updated for future requests
                    set({
                        currentWorkspace: {
                            ...company,
                            settings: null,
                            roles: roles,
                        },
                        workspaceType: 'COMPANY',
                    });

                    // Fetch company settings with explicit header
                    try {
                        const res = await apiClient.get(ENDPOINTS.COMPANIES.SETTINGS(companyId), {
                            headers: {
                                'X-Company-Id': companyId,
                                'X-Workspace-Type': 'COMPANY',
                            }
                        });
                        set((prev) => ({
                            currentWorkspace: {
                                ...prev.currentWorkspace,
                                settings: res.data,
                            },
                        }));
                    } catch (error) {
                        console.warn('[workspaceStore] Failed to fetch company settings:', error);
                    }
                } else {
                    console.warn('[workspaceStore] switchToCompany: company not found in workspaces', {
                        companyId,
                        availableWorkspaces: get().workspaces,
                    });
                }
            },

            clearWorkspace: () => {
                set({
                    workspaces: [],
                    currentWorkspace: null,
                    workspaceType: 'COMPANY',
                    error: null
                });
            },

            // Computed helpers
            isPersonalContext: () => false, // Deprecated, always false
            isCompanyContext: () => true, // Always true now
            getCurrentCompanyId: () => {
                const { currentWorkspace } = get();
                return currentWorkspace?.id || null;
            },

            // Role check helper
            hasRole: (...allowedRoles) => {
                const { currentWorkspace } = get();
                const userRoles = currentWorkspace?.roles || (currentWorkspace?.role ? [currentWorkspace.role] : ['MEMBER']);
                return allowedRoles.some(role => userRoles.includes(role));
            },

            // Permission check helper
            hasPermission: (permissionKey) => {
                const { currentWorkspace } = get();
                if (!currentWorkspace) return false;

                // Owner/Admin bypass
                const userRoles = currentWorkspace?.roles || (currentWorkspace?.role ? [currentWorkspace.role] : []);
                if (userRoles.includes('OWNER') || userRoles.includes('COMPANY_ADMIN')) return true;

                // Check user permissions object
                const perms = currentWorkspace.permissions;
                if (!perms) return false;

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
            // Persist both currentWorkspace AND workspaces so F5 works
            partialize: (state) => ({
                currentWorkspace: state.currentWorkspace,
                workspaces: state.workspaces,
                workspaceType: 'COMPANY',
            }),
            merge: (persistedState, currentState) => {
                const token = localStorage.getItem('accessToken');
                if (!token) return currentState;
                // If we have a persisted workspace, immediately mark hasFetched=true so
                // the AccessControlGuard doesn't redirect to /onboarding before the
                // store is rehydrated from localStorage.
                if (persistedState?.currentWorkspace) {
                    return {
                        ...currentState,
                        ...persistedState,
                        workspaceType: 'COMPANY',
                        hasFetched: true,
                        // workspaces may be empty if not persisted; that's OK — hasFetched:true
                        // tells the guard we've already authenticated and have a workspace.
                    };
                }
                return { ...currentState, ...persistedState };
            },
            onRehydrateStorage: () => (state, error) => {
                useWorkspaceStore.setState({ isHydrated: true });

                if (error) {
                    console.error('Failed to rehydrate workspace store:', error);
                    return;
                }

                const token = localStorage.getItem('accessToken');
                if (!token) return;

                if (state?.currentWorkspace?.id) {
                    const companyId = state.currentWorkspace.id;
                    import('@shared/api/client').then(({ default: apiClient }) => {
                        import('@shared/api/endpoints').then(({ ENDPOINTS }) => {
                            Promise.all([
                                apiClient.get(ENDPOINTS.COMPANIES.SETTINGS(companyId), {
                                    headers: {
                                        'X-Company-Id': companyId,
                                        'X-Workspace-Type': 'COMPANY',
                                    }
                                }),
                                apiClient.get(ENDPOINTS.COMPANIES.LIST)
                            ])
                                .then(([settingsRes, workspacesRes]) => {
                                    const companies = (workspacesRes.data || []).map(c => ({...c, type: 'COMPANY'}));
                                    const freshCompany = companies.find(w => w.id === companyId);
                                    const freshRoles = freshCompany?.roles || state.currentWorkspace.roles || ['EMPLOYEE'];
                                    const freshPermissions = freshCompany?.permissions || state.currentWorkspace.permissions || null;

                                    useWorkspaceStore.setState((prev) => ({
                                        workspaces: companies,
                                        currentWorkspace: {
                                            ...prev.currentWorkspace,
                                            settings: settingsRes.data,
                                            roles: freshRoles,
                                            permissions: freshPermissions,
                                            type: 'COMPANY'
                                        },
                                        workspaceType: 'COMPANY',
                                        hasFetched: true,
                                    }));
                                    console.log('[workspaceStore] Rehydrated + refreshed settings');
                                })
                                .catch(err => {
                                    console.warn('[workspaceStore] Background refresh failed:', err);
                                    // Mark as fetched even if refresh fails — we have persisted data
                                    useWorkspaceStore.setState({ hasFetched: true });
                                });
                        });
                    });
                }
            },
        }
    )
);

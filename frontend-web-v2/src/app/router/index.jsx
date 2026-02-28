import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layouts
import DashboardLayout from '@layouts/DashboardLayout';
import AuthLayout from '@layouts/AuthLayout';

// Guards
import { AccessControlGuard } from './guards/AccessControlGuard';
import SystemAdminGuard from './guards/SystemAdminGuard';

// Auth pages (not lazy - critical path)
import LoginPage from '@pages/auth/LoginPage';
import LandingPage from '@pages/public/LandingPage';
import OnboardingPage from '@pages/auth/OnboardingPage';
import RegisterPage from '@pages/auth/RegisterPage';

// Lazy load logout page
const LogoutPage = lazy(() => import('@pages/auth/LogoutPage'));
const ForgotPasswordPage = lazy(() => import('@pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@pages/auth/ResetPasswordPage'));


// Lazy load feature pages
const DashboardPage = lazy(() => import('@pages/dashboard/DashboardPage'));

// HR pages
const EmployeesPage = lazy(() => import('@pages/hr/EmployeesPage'));
const EmployeeDetailPage = lazy(() => import('@pages/hr/EmployeeDetailPage'));
const DepartmentsPage = lazy(() => import('@pages/hr/DepartmentsPage'));
const PositionsPage = lazy(() => import('@pages/hr/PositionsPage'));
const ProjectsPage = lazy(() => import('@pages/projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@pages/projects/ProjectDetailPage'));
const AttendancePage = lazy(() => import('@pages/hr/AttendancePage'));
const LeaveRequestsPage = lazy(() => import('@pages/hr/LeaveRequestsPage'));
const SalariesPage = lazy(() => import('@pages/hr/SalariesPage'));
const ContractsPage = lazy(() => import('@pages/hr/ContractsPage'));
const ReviewsPage = lazy(() => import('@pages/hr/ReviewsPage'));
const HRDashboardPage = lazy(() => import('@pages/hr/HRDashboardPage'));
const OrgChartPage = lazy(() => import('@pages/hr/OrgChartPage'));
const OKRPage = lazy(() => import('@pages/hr/OKRPage'));
const SkillsMatrixPage = lazy(() => import('@pages/hr/SkillsMatrixPage'));
const HROnboardingPage = lazy(() => import('@pages/hr/OnboardingPage'));
const ResourcePlanningPage = lazy(() => import('@pages/hr/ResourcePlanningPage'));

// Project pages
const MyIssuesPage = lazy(() => import('@pages/projects/MyIssuesPage'));

// Personal Workspace pages
const PersonalTasksPage = lazy(() => import('@pages/personal/PersonalTasksPage'));
const PersonalStoragePage = lazy(() => import('@pages/personal/PersonalStoragePage'));
const PersonalCalendarPage = lazy(() => import('@pages/personal/PersonalCalendarPage'));
const AnalyticsPage = lazy(() => import('@pages/projects/AnalyticsPage'));

// New feature pages
const CalendarPage = lazy(() => import('@pages/calendar/CalendarPage'));
const MyTimelogsPage = lazy(() => import('@pages/timelogs/MyTimelogsPage'));


const CompanySettingsPage = lazy(() => import('@pages/company/CompanySettingsPage'));
const CompanyDashboardPage = lazy(() => import('@pages/company/CompanyDashboardPage'));
const ActivityLogPage = lazy(() => import('@pages/company/ActivityLogPage'));
const BillingPage = lazy(() => import('@pages/company/BillingPage'));

// Other pages
const ProfilePage = lazy(() => import('@pages/profile/ProfilePage'));
const ChatPage = lazy(() => import('@pages/chat/ChatPage'));
const NotificationsPage = lazy(() => import('@pages/notifications/NotificationsPage'));
const StoragePage = lazy(() => import('@pages/storage/StoragePage'));

// System Admin
const SystemAdminLayout = lazy(() => import('@layouts/SystemAdminLayout'));
const AdminCompaniesPage = lazy(() => import('@pages/admin/AdminCompaniesPage'));
const AdminCompanyDetailPage = lazy(() => import('@pages/admin/AdminCompanyDetailPage'));
const AdminUsersPage = lazy(() => import('@pages/admin/AdminUsersPage'));
const AdminAnalyticsPage = lazy(() => import('@pages/admin/AdminAnalyticsPage'));
const AdminSettingsPage = lazy(() => import('@pages/admin/AdminSettingsPage'));

// Loading fallback
const PageLoader = () => (
    <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="loading-spinner" />
    </div>
);

const router = createBrowserRouter([
    // Landing page (public)
    {
        path: '/',
        element: <LandingPage />,
    },

    // Auth routes
    {
        element: <AuthLayout />,
        children: [
            { path: '/login', element: <LoginPage /> },
            { path: '/register', element: <RegisterPage /> },
            { path: '/logout', element: <Suspense fallback={<PageLoader />}><LogoutPage /></Suspense> },
            { path: '/forgot-password', element: <Suspense fallback={<PageLoader />}><ForgotPasswordPage /></Suspense> },
            { path: '/reset-password', element: <Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense> },
        ],
    },


    // System Admin Routes
    {
        path: '/admin',
        element: (
            <AccessControlGuard requireAuth={true}>
                <SystemAdminGuard>
                    <Suspense fallback={<PageLoader />}>
                        <SystemAdminLayout />
                    </Suspense>
                </SystemAdminGuard>
            </AccessControlGuard>
        ),
        children: [
            {
                path: 'companies',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <AdminCompaniesPage />
                    </Suspense>
                ),
            },
            {
                path: 'companies/:id',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <AdminCompanyDetailPage />
                    </Suspense>
                ),
            },
            {
                path: 'users',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <AdminUsersPage />
                    </Suspense>
                ),
            },
            {
                path: 'analytics',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <AdminAnalyticsPage />
                    </Suspense>
                ),
            },
            {
                path: 'settings',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <AdminSettingsPage />
                    </Suspense>
                ),
            },
            {
                index: true,
                element: <Navigate to="companies" replace />,
            }
        ],
    },

    // Onboarding (New Company Setup)
    {
        path: '/onboarding',
        element: (
            <AccessControlGuard requireAuth={true}>
                <OnboardingPage />
            </AccessControlGuard>
        ),
    },

    // Protected routes - require auth + company
    {
        path: '/app',
        element: (
            <AccessControlGuard requireAuth={true}>
                <DashboardLayout />
            </AccessControlGuard>
        ),
        children: [
            // Dashboard
            {
                index: true,
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <DashboardPage />
                    </Suspense>
                ),
            },

            // Personal Workspace (/app/me)
            {
                path: 'me',
                children: [
                    {
                        path: 'tasks',
                        element: (
                            <Suspense fallback={<PageLoader />}>
                                <PersonalTasksPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'issues',
                        element: (
                            <AccessControlGuard requiredFeature="project">
                                <Suspense fallback={<PageLoader />}>
                                    <MyIssuesPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'timelogs',
                        element: (
                            <AccessControlGuard requiredFeature="timeTracking">
                                <Suspense fallback={<PageLoader />}>
                                    <MyTimelogsPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'calendar',
                        element: (
                            <AccessControlGuard requiredFeature="calendar">
                                <Suspense fallback={<PageLoader />}>
                                    <CalendarPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'personal-calendar',
                        element: (
                            <Suspense fallback={<PageLoader />}>
                                <PersonalCalendarPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'storage',
                        element: (
                            <Suspense fallback={<PageLoader />}>
                                <PersonalStoragePage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'profile',
                        element: (
                            <Suspense fallback={<PageLoader />}>
                                <ProfilePage />
                            </Suspense>
                        ),
                    },
                ]
            },

            // HR Module (/app/hr)
            {
                path: 'hr',
                element: (
                    <AccessControlGuard
                        requireAuth={true}
                        requireCompany={true}
                    >
                        <Outlet />
                    </AccessControlGuard>
                ),
                children: [
                    {
                        path: 'dashboard',
                        element: (
                            <AccessControlGuard allowedRoles={['OWNER', 'ADMIN', 'MANAGER_HR']}>
                                <Suspense fallback={<PageLoader />}>
                                    <HRDashboardPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'employees',
                        element: (
                            <AccessControlGuard
                                requiredFeature="hr"
                                allowedRoles={['OWNER', 'ADMIN', 'MANAGER_HR']}
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <EmployeesPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'employees/:id',
                        element: (
                            <Suspense fallback={<PageLoader />}>
                                <EmployeeDetailPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'departments',
                        element: (
                            <AccessControlGuard
                                requiredFeature="hr"
                                allowedRoles={['OWNER', 'ADMIN', 'MANAGER_HR']}
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <DepartmentsPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'positions',
                        element: (
                            <AccessControlGuard
                                requiredFeature="hr"
                                allowedRoles={['OWNER', 'ADMIN', 'MANAGER_HR']}
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <PositionsPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'attendance',
                        element: (
                            <AccessControlGuard requiredFeature="attendance">
                                <Suspense fallback={<PageLoader />}>
                                    <AttendancePage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'leave-requests',
                        element: (
                            <AccessControlGuard requiredFeature="leave">
                                <Suspense fallback={<PageLoader />}>
                                    <LeaveRequestsPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'salaries',
                        element: (
                            <AccessControlGuard
                                requiredFeature="salary"
                                allowedRoles={['OWNER', 'ADMIN', 'MANAGER_ACCOUNTING', 'MANAGER_HR']}
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <SalariesPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'contracts',
                        element: (
                            <AccessControlGuard
                                requiredFeature="contract"
                                allowedRoles={['OWNER', 'ADMIN', 'MANAGER_HR']}
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <ContractsPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'reviews',
                        element: (
                            <AccessControlGuard
                                requiredFeature="review"
                                allowedRoles={['OWNER', 'ADMIN', 'MANAGER_HR']}
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <ReviewsPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'org-chart',
                        element: (
                            <AccessControlGuard
                                requiredFeature="orgChart"
                                allowedRoles={['OWNER', 'ADMIN', 'MANAGER_HR']}
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <OrgChartPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'okr',
                        element: (
                            <AccessControlGuard
                                requiredFeature="okr"
                                allowedRoles={['OWNER', 'ADMIN', 'MANAGER_HR']}
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <OKRPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'skills-matrix',
                        element: (
                            <AccessControlGuard
                                requiredFeature="skillsMatrix"
                                allowedRoles={['OWNER', 'ADMIN', 'MANAGER_HR']}
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <SkillsMatrixPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'onboarding',
                        element: (
                            <AccessControlGuard
                                requiredFeature="onboarding"
                                allowedRoles={['OWNER', 'ADMIN', 'MANAGER_HR']}
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <OnboardingPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'resource-planning',
                        element: (
                            <AccessControlGuard
                                requiredFeature="resourcePlanning"
                                allowedRoles={['OWNER', 'ADMIN', 'MANAGER_HR', 'MANAGER_PROJECT']}
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <ResourcePlanningPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                ]
            },

            // Project Module
            {
                path: 'projects',
                element: (
                    <AccessControlGuard requiredFeature="project">
                        <Suspense fallback={<PageLoader />}>
                            <ProjectsPage />
                        </Suspense>
                    </AccessControlGuard>
                ),
            },
            {
                path: 'projects/:id',
                element: (
                    <AccessControlGuard requiredFeature="project">
                        <Suspense fallback={<PageLoader />}>
                            <ProjectDetailPage />
                        </Suspense>
                    </AccessControlGuard>
                ),
            },
            {
                path: 'projects/:projectId/analytics',
                element: (
                    <AccessControlGuard requiredFeature="analytics">
                        <Suspense fallback={<PageLoader />}>
                            <AnalyticsPage />
                        </Suspense>
                    </AccessControlGuard>
                ),
            },

            // Company Module
            {
                path: 'company',
                element: (
                    <AccessControlGuard
                        requireAuth={true}
                        requireCompany={true}
                    >
                        <Outlet />
                    </AccessControlGuard>
                ),
                children: [
                    {
                        path: 'dashboard',
                        element: (
                            <AccessControlGuard allowedRoles={['OWNER', 'ADMIN']}>
                                <Suspense fallback={<PageLoader />}>
                                    <CompanyDashboardPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'activity',
                        element: (
                            <AccessControlGuard
                                requireAuth={true}
                                requireCompany={true}
                                allowedRoles={['OWNER', 'ADMIN']}
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <ActivityLogPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'billing',
                        element: (
                            <AccessControlGuard allowedRoles={['OWNER', 'ADMIN']}>
                                <Suspense fallback={<PageLoader />}>
                                    <BillingPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'settings',
                        element: (
                            <AccessControlGuard allowedRoles={['OWNER', 'ADMIN']}>
                                <Suspense fallback={<PageLoader />}>
                                    <CompanySettingsPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                ]
            },

            // Common pages
            {
                path: 'chat',
                element: (
                    <AccessControlGuard requiredFeature="chat">
                        <Suspense fallback={<PageLoader />}>
                            <ChatPage />
                        </Suspense>
                    </AccessControlGuard>
                ),
            },
            {
                path: 'notifications',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <NotificationsPage />
                    </Suspense>
                ),
            },
            {
                path: 'billing',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <BillingPage />
                    </Suspense>
                ),
            },
            {
                path: 'storage',
                element: (
                    <AccessControlGuard requiredFeature="storage">
                        <Suspense fallback={<PageLoader />}>
                            <StoragePage />
                        </Suspense>
                    </AccessControlGuard>
                ),
            },
            // Settings Redirect (Legacy/Cleanup)
            {
                path: 'settings/workspace',
                element: <Navigate to="/app/company/settings" replace />
            },
        ],
    },

    // Catch all - redirect to landing page
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);

export function AppRouter() {
    return <RouterProvider router={router} />;
}

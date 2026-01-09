import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layouts
import DashboardLayout from '@layouts/DashboardLayout';
import AuthLayout from '@layouts/AuthLayout';

// Guards
import { AuthGuard } from './guards/AuthGuard';
import { CompanyGuard } from './guards/CompanyGuard';
import { RoleGuard } from './guards/RoleGuard';
import SystemAdminGuard from './guards/SystemAdminGuard';
import FeatureGuard from './guards/FeatureGuard';

// Auth pages (not lazy - critical path)
import LoginPage from '@pages/auth/LoginPage';
import SelectCompanyPage from '@pages/auth/SelectCompanyPage';
import LandingPage from '@pages/public/LandingPage';
import OnboardingPage from '@pages/auth/OnboardingPage';
import RegisterPage from '@pages/auth/RegisterPage';

// Portal (User Hub)
import PortalPage from '@pages/portal/PortalPage';

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

// Project pages
const MyIssuesPage = lazy(() => import('@pages/projects/MyIssuesPage'));


const CompanySettingsPage = lazy(() => import('@pages/company/CompanySettingsPage'));

// Other pages
const ProfilePage = lazy(() => import('@pages/profile/ProfilePage'));
const ChatPage = lazy(() => import('@pages/chat/ChatPage'));
const NotificationsPage = lazy(() => import('@pages/notifications/NotificationsPage'));
const StoragePage = lazy(() => import('@pages/storage/StoragePage'));

// System Admin
const SystemAdminLayout = lazy(() => import('@layouts/SystemAdminLayout'));
const AdminCompaniesPage = lazy(() => import('@pages/admin/AdminCompaniesPage'));
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
    // Public routes
    {
        element: <AuthLayout />,
        children: [
            { path: '/login', element: <LoginPage /> },
            { path: '/register', element: <RegisterPage /> },
        ],
    },

    // System Admin Routes
    {
        path: '/admin',
        element: (
            <AuthGuard>
                <SystemAdminGuard>
                    <Suspense fallback={<PageLoader />}>
                        <SystemAdminLayout />
                    </Suspense>
                </SystemAdminGuard>
            </AuthGuard>
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

    // Company selection (authenticated but no company yet)
    {
        path: '/select-company',
        element: (
            <AuthGuard>
                <SelectCompanyPage />
            </AuthGuard>
        ),
    },
    // Onboarding (New Company Setup)
    {
        path: '/onboarding',
        element: (
            <AuthGuard>
                <OnboardingPage />
            </AuthGuard>
        ),
    },

    // User Portal (Hub)
    {
        path: '/portal',
        element: (
            <AuthGuard>
                <PortalPage />
            </AuthGuard>
        ),
    },

    // Landing Page (Public)
    {
        path: '/',
        element: <LandingPage />,
    },

    // Protected routes - require auth + company
    {
        path: '/app',
        element: (
            <AuthGuard>
                <CompanyGuard>
                    <DashboardLayout />
                </CompanyGuard>
            </AuthGuard>
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

            // HR Module
            {
                path: 'employees',
                element: (
                    <RoleGuard roles={['OWNER', 'ADMIN', 'MANAGER_HR']}>
                        <Suspense fallback={<PageLoader />}>
                            <EmployeesPage />
                        </Suspense>
                    </RoleGuard>
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
                    <RoleGuard roles={['OWNER', 'ADMIN', 'MANAGER_HR']}>
                        <Suspense fallback={<PageLoader />}>
                            <DepartmentsPage />
                        </Suspense>
                    </RoleGuard>
                ),
            },
            {
                path: 'positions',
                element: (
                    <RoleGuard roles={['OWNER', 'ADMIN', 'MANAGER_HR']}>
                        <Suspense fallback={<PageLoader />}>
                            <PositionsPage />
                        </Suspense>
                    </RoleGuard>
                ),
            },
            {
                path: 'attendance',
                element: (
                    <FeatureGuard feature="attendance">
                        <Suspense fallback={<PageLoader />}>
                            <AttendancePage />
                        </Suspense>
                    </FeatureGuard>
                ),
            },
            {
                path: 'leave-requests',
                element: (
                    <FeatureGuard feature="leave">
                        <Suspense fallback={<PageLoader />}>
                            <LeaveRequestsPage />
                        </Suspense>
                    </FeatureGuard>
                ),
            },
            {
                path: 'salaries',
                element: (
                    <FeatureGuard feature="salary">
                        <RoleGuard roles={['OWNER', 'ADMIN', 'MANAGER_ACCOUNTING']}>
                            <Suspense fallback={<PageLoader />}>
                                <SalariesPage />
                            </Suspense>
                        </RoleGuard>
                    </FeatureGuard>
                ),
            },
            {
                path: 'contracts',
                element: (
                    <FeatureGuard feature="contract">
                        <RoleGuard roles={['OWNER', 'ADMIN', 'MANAGER_HR']}>
                            <Suspense fallback={<PageLoader />}>
                                <ContractsPage />
                            </Suspense>
                        </RoleGuard>
                    </FeatureGuard>
                ),
            },

            // Project Module
            {
                path: 'projects',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <ProjectsPage />
                    </Suspense>
                ),
            },
            {
                path: 'projects/:id',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <ProjectDetailPage />
                    </Suspense>
                ),
            },
            {
                path: 'my-issues',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <MyIssuesPage />
                    </Suspense>
                ),
            },

            // Common pages
            {
                path: 'profile',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <ProfilePage />
                    </Suspense>
                ),
            },
            {
                path: 'chat',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <ChatPage />
                    </Suspense>
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
                path: 'storage',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <StoragePage />
                    </Suspense>
                ),
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

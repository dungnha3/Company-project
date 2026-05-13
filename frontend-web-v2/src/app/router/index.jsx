import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layouts
import DashboardLayout from '@layouts/DashboardLayout';
import AuthLayout from '@layouts/AuthLayout';
import SectionTabLayout, { HR_TAB_CONFIG } from '@layouts/SectionTabLayout';

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

const ProjectsPage = lazy(() => import('@pages/projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@pages/projects/ProjectDetailPage'));
const LeaveRequestsPage = lazy(() => import('@pages/hr/LeaveRequestsPage'));
const ReviewsPage = lazy(() => import('@pages/hr/ReviewsPage'));
const ResourcePlanningPage = lazy(() => import('@pages/hr/ResourcePlanningPage'));
const PerformanceOverviewPage = lazy(() => import('@pages/hr/PerformanceOverviewPage'));
const HRDashboardPage = lazy(() => import('@pages/hr/HRDashboardPage'));

// Project pages
const MyIssuesPage = lazy(() => import('@pages/projects/MyIssuesPage'));


// New feature pages
const CalendarPage = lazy(() => import('@pages/calendar/CalendarPage'));
const MyPerformancePage = lazy(() => import('@pages/hr/MyPerformancePage'));
const MyWorkPage = lazy(() => import('@pages/personal/MyWorkPage'));
const MyTimelogsPage = lazy(() => import('@pages/personal/MyTimelogsPage'));

const AnalyticsPage = lazy(() => import('@pages/projects/AnalyticsPage'));
const ReportsPage = lazy(() => import('@pages/reports/ReportsPage'));


const ActivityLogPage = lazy(() => import('@pages/company/ActivityLogPage'));
const CompanySettingsPage = lazy(() => import('@pages/company/CompanySettingsPage'));

// Other pages
const ProfilePage = lazy(() => import('@pages/profile/ProfilePage'));
const NotificationsPage = lazy(() => import('@pages/notifications/NotificationsPage'));

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
            <AccessControlGuard requireAuth={true} requireCompany={true}>
                <DashboardLayout />
            </AccessControlGuard>
        ),
        children: [
            // Redirect root /app to Projects (or My Issues if preferred)
            {
                index: true,
                element: <Navigate to="/app/projects" replace />,
            },

            // Personal Work Hub (/app/me)
            {
                path: 'me',
                children: [
                    {
                        index: true,
                        element: (
                            <AccessControlGuard>
                                <Suspense fallback={<PageLoader />}>
                                    <MyWorkPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'issues',
                        element: (
                            <AccessControlGuard>
                                <Suspense fallback={<PageLoader />}>
                                    <MyIssuesPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'timelogs',
                        element: (
                            <AccessControlGuard>
                                <Suspense fallback={<PageLoader />}>
                                    <MyTimelogsPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'calendar',
                        element: (
                            <AccessControlGuard>
                                <Suspense fallback={<PageLoader />}>
                                    <CalendarPage />
                                </Suspense>
                            </AccessControlGuard>
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
                    {
                        path: 'performance',
                        element: (
                            <AccessControlGuard>
                                <Suspense fallback={<PageLoader />}>
                                    <MyPerformancePage />
                                </Suspense>
                            </AccessControlGuard>
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
                        <SectionTabLayout
                            tabConfig={HR_TAB_CONFIG}
                            title="Nhân sự (HR)"
                            icon="fa-users-gear"
                        />
                    </AccessControlGuard>
                ),
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<PageLoader />}>
                                <HRDashboardPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'employees',
                        element: (
                            <AccessControlGuard
                                requiredPermission="HR.VIEW_LIST"
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <EmployeesPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },


                    {
                        path: 'leave-requests',
                        element: (
                            <AccessControlGuard>
                                <Suspense fallback={<PageLoader />}>
                                    <LeaveRequestsPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'reviews',
                        element: (
                            <AccessControlGuard
                                requiredPermission="HR.MANAGE_REVIEWS"
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <ReviewsPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'performance',
                        element: (
                            <AccessControlGuard
                                requiredPermission="HR.MANAGE_REVIEWS"
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <PerformanceOverviewPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'resource-planning',
                        element: (
                            <AccessControlGuard
                                requiredPermission="PROJECT.MANAGE_ALL"
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
                    <AccessControlGuard>
                        <Suspense fallback={<PageLoader />}>
                            <ProjectsPage />
                        </Suspense>
                    </AccessControlGuard>
                ),
            },
            {
                path: 'projects/:id',
                element: (
                    <AccessControlGuard>
                        <Suspense fallback={<PageLoader />}>
                            <ProjectDetailPage />
                        </Suspense>
                    </AccessControlGuard>
                ),
            },
            {
                path: 'projects/:projectId/analytics',
                element: (
                    <AccessControlGuard>
                        <Suspense fallback={<PageLoader />}>
                            <AnalyticsPage />
                        </Suspense>
                    </AccessControlGuard>
                ),
            },

            // Reports
            {
                path: 'reports',
                element: (
                    <AccessControlGuard>
                        <Suspense fallback={<PageLoader />}>
                            <ReportsPage />
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
                        path: 'activity',
                        element: (
                            <AccessControlGuard
                                requireAuth={true}
                                requireCompany={true}
                                allowedRoles={['OWNER', 'COMPANY_ADMIN']}
                            >
                                <Suspense fallback={<PageLoader />}>
                                    <ActivityLogPage />
                                </Suspense>
                            </AccessControlGuard>
                        ),
                    },
                    {
                        path: 'settings',
                        element: (
                            <AccessControlGuard
                                requireAuth={true}
                                requireCompany={true}
                                allowedRoles={['OWNER', 'COMPANY_ADMIN']}
                            >
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
                path: 'notifications',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <NotificationsPage />
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

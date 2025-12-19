import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { USER_ROLES, ROLE_ROUTES } from '@/shared/constants/roles.constants';

// Layouts
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import UnauthorizedPage from '@/pages/Unauthorized';

// Dashboard pages (feature-based)
import { AdminDashboard } from '@/features/dashboard/admin';
import { HrManagerDashboard } from '@/features/dashboard/hr-manager';
import { AccountingManagerDashboard } from '@/features/dashboard/accounting-manager';
import { ProjectManagerDashboard } from '@/features/dashboard/project-manager';
import { EmployeeDashboard } from '@/features/dashboard/employee';

// Route guards
import PrivateRoute from './PrivateRoute';
import RoleRoute from './RoleRoute';

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root based on auth status */}
        <Route 
          path="/" 
          element={
            user ? <Navigate to={ROLE_ROUTES[user.role]} replace /> : <Navigate to="/login" replace />
          } 
        />

        {/* Public routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
        </Route>

        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          <Route element={<DashboardLayout />}>
            {/* Admin routes */}
            <Route 
              path="/admin/*" 
              element={
                <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                  <AdminDashboard />
                </RoleRoute>
              } 
            />

            {/* HR Manager routes */}
            <Route 
              path="/hr/*" 
              element={
                <RoleRoute allowedRoles={[USER_ROLES.MANAGER_HR]}>
                  <HrManagerDashboard />
                </RoleRoute>
              } 
            />

            {/* Accounting Manager routes */}
            <Route 
              path="/accounting/*" 
              element={
                <RoleRoute allowedRoles={[USER_ROLES.MANAGER_ACCOUNTING]}>
                  <AccountingManagerDashboard />
                </RoleRoute>
              } 
            />

            {/* Project Manager routes */}
            <Route 
              path="/projects/*" 
              element={
                <RoleRoute allowedRoles={[USER_ROLES.MANAGER_PROJECT]}>
                  <ProjectManagerDashboard />
                </RoleRoute>
              } 
            />

            {/* Employee routes */}
            <Route 
              path="/employee/*" 
              element={
                <RoleRoute allowedRoles={[USER_ROLES.EMPLOYEE]}>
                  <EmployeeDashboard />
                </RoleRoute>
              } 
            />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;

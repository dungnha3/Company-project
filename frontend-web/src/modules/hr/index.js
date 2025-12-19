// HR Manager Dashboard - Chỉ export những gì thực sự dùng
export { default as EmployeesPage } from '@/features/hr/employees/pages/EmployeesPage'
export { default as EmployeeDetailPage } from '@/features/hr/employees/pages/EmployeeDetailPage'
export { default as LeavesPage } from '@/features/hr/leaves/pages/LeavesPage'
export { default as HRStoragePage } from '@/features/hr/storage/HRStoragePage'
export { default as DepartmentsPage } from '@/features/hr/departments/pages/DepartmentsPage'
export { default as DepartmentDetailPage } from '@/features/hr/departments/pages/DepartmentDetailPage'
export { default as ContractsPage } from '@/features/hr/contracts/pages/ContractsPage'
export { default as PositionsPage } from '@/features/hr/positions/pages/PositionsPage'
export { default as EvaluationsPage } from '@/features/hr/evaluations/pages/EvaluationsPage'
export { default as HRDashboardPage } from '@/features/hr/dashboard/pages/HRDashboardPage'

// ❌ Removed: AttendancePage, PayrollPage (HR không có quyền)
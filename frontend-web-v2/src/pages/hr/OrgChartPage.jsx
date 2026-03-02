import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { Avatar } from '@shared/components/OptimizedImage';

export default function OrgChartPage() {
    const navigate = useNavigate();
    const [selectedDept, setSelectedDept] = useState(null);
    const [zoomLevel, setZoomLevel] = useState(1);

    // Fetch departments
    const { data: departments, isLoading: loadingDepts } = useQuery({
        queryKey: ['departments-org'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.DEPARTMENTS.LIST)).data,
    });

    // Fetch employees
    const { data: employees, isLoading: loadingEmps } = useQuery({
        queryKey: ['employees-org'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.EMPLOYEES.LIST)).data,
    });

    const deptList = Array.isArray(departments) ? departments : departments?.content || [];
    const empList = Array.isArray(employees) ? employees : employees?.content || [];

    // Build org tree
    const orgTree = useMemo(() => {
        return deptList.map(dept => ({
            ...dept,
            employees: empList.filter(emp =>
                emp.department?.departmentId === dept.departmentId ||
                emp.department?.id === dept.departmentId
            ),
            manager: empList.find(emp =>
                (emp.department?.departmentId === dept.departmentId || emp.department?.id === dept.departmentId) &&
                (emp.position?.name?.toLowerCase().includes('trưởng') ||
                    emp.position?.name?.toLowerCase().includes('manager') ||
                    emp.position?.level >= 3)
            )
        }));
    }, [deptList, empList]);

    const isLoading = loadingDepts || loadingEmps;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sơ đồ tổ chức</h1>
                    <p className="text-gray-500 text-sm">Cấu trúc phòng ban và nhân sự</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 px-2 py-1">
                        <button
                            onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))}
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded"
                        >
                            <i className="fa-solid fa-minus text-sm" />
                        </button>
                        <span className="w-12 text-center text-sm text-gray-600">
                            {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                            onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))}
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded"
                        >
                            <i className="fa-solid fa-plus text-sm" />
                        </button>
                    </div>
                    <button
                        onClick={() => setZoomLevel(1)}
                        className="btn-ghost text-sm"
                    >
                        <i className="fa-solid fa-arrows-rotate mr-1" /> Đặt lại
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard
                    label="Phòng ban"
                    value={deptList.length}
                    icon="fa-building"
                    color="bg-indigo-500"
                />
                <StatCard
                    label="Nhân viên"
                    value={empList.length}
                    icon="fa-users"
                    color="bg-green-500"
                />
                <StatCard
                    label="Trưởng phòng"
                    value={orgTree.filter(d => d.manager).length}
                    icon="fa-user-tie"
                    color="bg-purple-500"
                />
            </div>

            {/* Org Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 p-6 overflow-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="loading-spinner" />
                    </div>
                ) : (
                    <div
                        className="org-chart-container transition-transform duration-200"
                        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                    >
                        {/* Company Root */}
                        <div className="flex flex-col items-center">
                            <div className="org-node org-node-company">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-3">
                                    <i className="fa-solid fa-building" />
                                </div>
                                <div className="text-lg font-bold text-gray-900">Workspace</div>
                                <div className="text-sm text-gray-500">{deptList.length} Phòng ban</div>
                            </div>

                            {/* Connector line */}
                            <div className="w-0.5 h-8 bg-gray-300" />

                            {/* Horizontal line */}
                            <div
                                className="h-0.5 bg-gray-300"
                                style={{ width: `${Math.min(orgTree.length * 280, 1400)}px` }}
                            />

                            {/* Departments */}
                            <div className="flex flex-wrap gap-6 justify-center mt-0">
                                {orgTree.map((dept, index) => (
                                    <DepartmentNode
                                        key={dept.departmentId || index}
                                        department={dept}
                                        isSelected={selectedDept === dept.departmentId}
                                        onClick={() => setSelectedDept(
                                            selectedDept === dept.departmentId ? null : dept.departmentId
                                        )}
                                        onViewEmployee={(empId) => navigate(`/app/hr/employees/${empId}`)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full" />
                    <span>Phòng ban</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full" />
                    <span>Trưởng phòng</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                    <span>Nhân viên</span>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white`}>
                    <i className={`fa-solid ${icon} text-lg`} />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                </div>
            </div>
        </div>
    );
}

function DepartmentNode({ department, isSelected, onClick, onViewEmployee }) {
    const employees = department.employees || [];
    const manager = department.manager;
    const directReports = employees.filter(e => e !== manager).slice(0, 6);
    const moreCount = employees.length - 1 - directReports.length;

    return (
        <div className="flex flex-col items-center">
            {/* Vertical connector */}
            <div className="w-0.5 h-6 bg-gray-300" />

            {/* Department Card */}
            <div
                onClick={onClick}
                className={`org-node org-node-dept cursor-pointer transition-all duration-200 ${isSelected ? 'ring-2 ring-indigo-500 shadow-lg' : 'hover:shadow-md'
                    }`}
            >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow mb-2">
                    {department.name?.charAt(0) || 'D'}
                </div>
                <div className="text-sm font-semibold text-gray-900 text-center">
                    {department.name}
                </div>
                <div className="text-xs text-gray-500">
                    {employees.length} thành viên
                </div>
            </div>

            {/* Expanded content */}
            {isSelected && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Connector */}
                    <div className="w-0.5 h-4 bg-gray-300 mx-auto" />

                    {/* Manager */}
                    {manager && (
                        <>
                            <EmployeeCard
                                employee={manager}
                                isManager
                                onClick={() => onViewEmployee(manager.employeeId || manager.id)}
                            />
                            <div className="w-0.5 h-4 bg-gray-300 mx-auto" />
                            <div className="h-0.5 w-40 bg-gray-300 mx-auto" />
                        </>
                    )}

                    {/* Direct Reports */}
                    <div className="flex flex-wrap gap-2 justify-center mt-2 max-w-xs">
                        {directReports.map((emp, i) => (
                            <EmployeeCard
                                key={emp.employeeId || emp.id || i}
                                employee={emp}
                                compact
                                onClick={() => onViewEmployee(emp.employeeId || emp.id)}
                            />
                        ))}
                        {moreCount > 0 && (
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-xs font-medium">
                                +{moreCount}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function EmployeeCard({ employee, isManager, compact, onClick }) {
    const initials = (employee.fullName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    if (compact) {
        return (
            <div
                onClick={onClick}
                className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-colors group relative"
                title={employee.fullName}
            >
                {employee.avatarUrl ? (
                    <Avatar src={employee.avatarUrl} name={employee.fullName} className="w-full h-full rounded-full" />
                ) : (
                    <span className="text-xs font-semibold text-gray-600">{initials}</span>
                )}

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {employee.fullName}
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className={`org-node cursor-pointer transition-all hover:shadow-md ${isManager ? 'org-node-manager' : ''
                }`}
        >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold shadow mb-2 ${isManager
                ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                : 'bg-gradient-to-br from-gray-400 to-gray-500'
                }`}>
                {employee.avatarUrl ? (
                    <Avatar src={employee.avatarUrl} name={employee.fullName} className="w-full h-full rounded-full" />
                ) : (
                    <span>{initials}</span>
                )}
            </div>
            <div className="text-sm font-medium text-gray-900 text-center">{employee.fullName}</div>
            <div className="text-xs text-gray-500">{employee.position?.name || 'Nhân viên'}</div>
            {isManager && (
                <span className="mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                    Trưởng phòng
                </span>
            )}
        </div>
    );
}

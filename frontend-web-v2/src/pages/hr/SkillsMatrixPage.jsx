import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatNumber } from '@shared/utils/formatters';

const SKILL_LEVELS = {
    0: { label: 'Chưa có', color: 'bg-gray-100 text-gray-400', icon: 'fa-circle' },
    1: { label: 'Cơ bản', color: 'bg-yellow-100 text-yellow-700', icon: 'fa-star-half-stroke' },
    2: { label: 'Trung bình', color: 'bg-blue-100 text-blue-700', icon: 'fa-star' },
    3: { label: 'Thành thạo', color: 'bg-green-100 text-green-700', icon: 'fa-star' },
    4: { label: 'Chuyên gia', color: 'bg-purple-100 text-purple-700', icon: 'fa-crown' },
};

// Default skills categories as fallback
const DEFAULT_SKILL_CATEGORIES = [
    {
        name: 'Kỹ năng kỹ thuật',
        skills: ['JavaScript', 'React', 'Node.js', 'Python', 'Java', 'SQL', 'DevOps', 'Cloud']
    },
    {
        name: 'Kỹ năng mềm',
        skills: ['Giao tiếp', 'Làm việc nhóm', 'Quản lý thời gian', 'Giải quyết vấn đề', 'Lãnh đạo']
    },
    {
        name: 'Công cụ',
        skills: ['Git', 'Jira', 'Figma', 'Docker', 'AWS', 'Excel']
    }
];

export default function SkillsMatrixPage() {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('matrix'); // matrix, list

    // Fetch employees
    const { data: employees, isLoading: loadingEmployees } = useQuery({
        queryKey: ['employees-skills'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.EMPLOYEES.LIST)).data,
    });

    // Fetch departments
    const { data: departments } = useQuery({
        queryKey: ['departments-skills'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.DEPARTMENTS.LIST)).data,
    });

    // Fetch Skills Matrix (Real Data)
    const { data: skillsMatrix = {} } = useQuery({
        queryKey: ['skills-matrix'],
        queryFn: async () => {
            try {
                return (await apiClient.get(ENDPOINTS.SKILLS.MATRIX)).data;
            } catch (e) {
                return {};
            }
        }
    });

    // Fetch Skill Categories (Optional, fallback to DEFAULT)
    const { data: skillCategories = DEFAULT_SKILL_CATEGORIES } = useQuery({
        queryKey: ['skills-list'],
        queryFn: async () => {
            try {
                const res = await apiClient.get(ENDPOINTS.SKILLS.LIST);
                return res.data?.length ? res.data : DEFAULT_SKILL_CATEGORIES;
            } catch {
                return DEFAULT_SKILL_CATEGORIES;
            }
        }
    });

    const empList = Array.isArray(employees) ? employees : employees?.content || [];
    const deptList = Array.isArray(departments) ? departments : departments?.content || [];

    // All skills flattened
    const allSkills = useMemo(() => {
        if (selectedCategory === 'all') {
            return skillCategories.flatMap(cat => cat.skills || []);
        }
        const category = skillCategories.find(c => c.name === selectedCategory);
        return category?.skills || [];
    }, [selectedCategory, skillCategories]);

    // Filter employees
    const filteredEmployees = useMemo(() => {
        return empList.filter(emp => {
            // Department filter
            if (selectedDepartment !== 'all') {
                const deptId = emp.department?.departmentId || emp.department?.id;
                if (String(deptId) !== selectedDepartment) return false;
            }
            // Search filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!emp.fullName?.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [empList, selectedDepartment, searchQuery]);

    // Get skill level for an employee
    const getSkillLevel = (empId, skill) => {
        const skills = skillsMatrix[empId] || {};
        return skills[skill] || 0;
    };

    // Calculate skill stats
    const skillStats = useMemo(() => {
        const stats = {};
        allSkills.forEach(skill => {
            const levels = filteredEmployees.map(emp => getSkillLevel(emp.employeeId || emp.id, skill));
            const hasSkill = levels.filter(l => l > 0);
            stats[skill] = {
                coverage: Math.round((hasSkill.length / filteredEmployees.length) * 100) || 0,
                avgLevel: hasSkill.length > 0
                    ? formatNumber(hasSkill.reduce((a, b) => a + b, 0) / hasSkill.length, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                    : 0,
                experts: levels.filter(l => l >= 3).length,
            };
        });
        return stats;
    }, [allSkills, filteredEmployees, skillsMatrix]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ma trận kỹ năng</h1>
                    <p className="text-gray-500 text-sm">Quản lý năng lực và kỹ năng nhân viên</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('matrix')}
                            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'matrix' ? 'bg-white shadow-sm' : 'text-gray-500'
                                }`}
                        >
                            <i className="fa-solid fa-table-cells" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'
                                }`}
                        >
                            <i className="fa-solid fa-list" />
                        </button>
                    </div>
                    <button className="btn-primary">
                        <i className="fa-solid fa-plus mr-2" /> Thêm kỹ năng
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm nhân viên..."
                                className="input w-full pl-10"
                            />
                        </div>
                    </div>

                    {/* Category Filter */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="input min-w-[180px]"
                    >
                        <option value="all">Tất cả kỹ năng</option>
                        {skillCategories.map(cat => (
                            <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>

                    {/* Department Filter */}
                    <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="input min-w-[180px]"
                    >
                        <option value="all">Tất cả phòng ban</option>
                        {deptList.map(dept => (
                            <option key={dept.departmentId || dept.id} value={dept.departmentId || dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Skill Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Tổng kỹ năng"
                    value={allSkills.length}
                    icon="fa-brain"
                    color="bg-indigo-500"
                />
                <StatCard
                    label="Nhân viên"
                    value={filteredEmployees.length}
                    icon="fa-users"
                    color="bg-blue-500"
                />
                <StatCard
                    label="Chuyên gia (Lv3+)"
                    value={Object.values(skillStats).reduce((sum, s) => sum + s.experts, 0)}
                    icon="fa-crown"
                    color="bg-purple-500"
                />
                <StatCard
                    label="Kỹ năng thiếu"
                    value={Object.values(skillStats).filter(s => s.coverage < 30).length}
                    icon="fa-exclamation-triangle"
                    color="bg-orange-500"
                />
            </div>

            {/* Matrix View */}
            {viewMode === 'matrix' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 min-w-[200px]">
                                        Nhân viên
                                    </th>
                                    {allSkills.slice(0, 10).map(skill => (
                                        <th key={skill} className="px-3 py-3 text-center font-medium text-gray-600 min-w-[100px]">
                                            <div className="truncate" title={skill}>{skill}</div>
                                            <div className="text-xs text-gray-400 font-normal mt-0.5">
                                                {skillStats[skill]?.coverage || 0}%
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loadingEmployees ? (
                                    <tr>
                                        <td colSpan={allSkills.length + 1} className="px-4 py-8 text-center text-gray-400">
                                            <div className="loading-spinner mx-auto" />
                                        </td>
                                    </tr>
                                ) : filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={allSkills.length + 1} className="px-4 py-8 text-center text-gray-400">
                                            Không có nhân viên nào
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmployees.slice(0, 15).map(emp => (
                                        <tr key={emp.employeeId || emp.id} className="hover:bg-gray-50/50">
                                            <td className="sticky left-0 z-10 bg-white px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                        {(emp.fullName || 'U').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{emp.fullName}</div>
                                                        <div className="text-xs text-gray-500">{emp.position?.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            {allSkills.slice(0, 10).map(skill => {
                                                const level = getSkillLevel(emp.employeeId || emp.id, skill);
                                                return (
                                                    <td key={skill} className="px-3 py-3 text-center">
                                                        <SkillBadge level={level} />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* List View */
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEmployees.slice(0, 12).map(emp => (
                        <EmployeeSkillCard
                            key={emp.employeeId || emp.id}
                            employee={emp}
                            skills={skillsMatrix[emp.employeeId || emp.id] || {}}
                        />
                    ))}
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 py-4">
                {Object.entries(SKILL_LEVELS).map(([level, config]) => (
                    <div key={level} className="flex items-center gap-2 text-sm">
                        <SkillBadge level={parseInt(level)} />
                        <span className="text-gray-600">{config.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }) {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
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

function SkillBadge({ level }) {
    const colors = ['bg-gray-200', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500', 'bg-purple-500'];

    return (
        <div className="flex items-center justify-center gap-0.5">
            {[1, 2, 3, 4].map(i => (
                <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-sm ${i <= level ? colors[level] : 'bg-gray-200'}`}
                />
            ))}
        </div>
    );
}

function EmployeeSkillCard({ employee, skills }) {
    const topSkills = Object.entries(skills)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {(employee.fullName || 'U').charAt(0)}
                </div>
                <div>
                    <div className="font-semibold text-gray-900">{employee.fullName}</div>
                    <div className="text-sm text-gray-500">{employee.position?.name || 'Chưa có vị trí'}</div>
                </div>
            </div>

            <div className="space-y-2">
                {topSkills.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-2">Chưa có kỹ năng</p>
                ) : (
                    topSkills.map(([skill, level]) => (
                        <div key={skill} className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">{skill}</span>
                            <SkillBadge level={level} />
                        </div>
                    ))
                )}
            </div>

            <button className="w-full mt-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                <i className="fa-solid fa-edit mr-1" /> Chỉnh sửa kỹ năng
            </button>
        </div>
    );
}

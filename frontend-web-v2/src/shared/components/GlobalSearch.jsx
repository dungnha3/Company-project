import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

const SEARCH_CATEGORIES = [
    { id: 'employees', label: 'Nhân viên', icon: 'fa-users', color: 'text-blue-500' },
    { id: 'projects', label: 'Dự án', icon: 'fa-folder-open', color: 'text-purple-500' },
    { id: 'issues', label: 'Công việc', icon: 'fa-list-check', color: 'text-green-500' },
    { id: 'departments', label: 'Phòng ban', icon: 'fa-building', color: 'text-orange-500' },
];

const QUICK_ACTIONS = [
    { id: 'new-employee', label: 'Thêm nhân viên', icon: 'fa-user-plus', path: '/app/hr/employees', color: 'text-blue-500' },
    { id: 'new-project', label: 'Tạo dự án mới', icon: 'fa-folder-plus', path: '/app/projects', color: 'text-purple-500' },
    { id: 'new-leave', label: 'Tạo đơn nghỉ phép', icon: 'fa-calendar-plus', path: '/app/leave-requests', color: 'text-green-500' },
    { id: 'hr-dashboard', label: 'HR Dashboard', icon: 'fa-gauge-high', path: '/app/hr-dashboard', color: 'text-indigo-500' },
    { id: 'org-chart', label: 'Sơ đồ tổ chức', icon: 'fa-sitemap', path: '/app/org-chart', color: 'text-teal-500' },
];

export default function GlobalSearch({ isOpen, onClose }) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [activeCategory, setActiveCategory] = useState('all');
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Unified Global Search
    const { data: searchResults } = useQuery({
        queryKey: ['global-search', query],
        queryFn: async () => (await apiClient.get(ENDPOINTS.SEARCH, { params: { keyword: query } })).data,
        enabled: isOpen && query.trim().length > 1,
        staleTime: 60000,
    });

    // Filter results based on query
    const getResults = useCallback(() => {
        if (!query.trim()) return [];

        const results = [];

        // Helper to map API results to search items
        const mapItems = (items, type, icon, color, getTitle, getSubtitle, getPath) => {
            if (!items) return;
            items.slice(0, 5).forEach(item => {
                results.push({
                    type,
                    id: item.id || item[`${type}Id`], // Handle different ID fields
                    title: getTitle(item),
                    subtitle: getSubtitle(item),
                    icon,
                    color,
                    path: getPath(item),
                });
            });
        };

        // Employees
        if (activeCategory === 'all' || activeCategory === 'employees') {
            mapItems(
                searchResults?.employees,
                'employee',
                'fa-user',
                'text-blue-500',
                e => e.fullName,
                e => e.position || e.email,
                e => `/app/hr/employees/${e.id}`
            );
        }

        // Projects
        if (activeCategory === 'all' || activeCategory === 'projects') {
            mapItems(
                searchResults?.projects,
                'project',
                'fa-folder-open',
                'text-purple-500',
                p => p.name,
                p => `${p.status} • ${p.memberCount || 0} members`,
                p => `/app/projects/${p.id}`
            );
        }

        // Departments
        if (activeCategory === 'all' || activeCategory === 'departments') {
            mapItems(
                searchResults?.departments,
                'department',
                'fa-building',
                'text-orange-500',
                d => d.name,
                d => `${d.employeeCount || 0} nhân viên`,
                d => '/app/hr/departments'
            );
        }

        // Issues (New Category supported by backend)
        if (activeCategory === 'all' || activeCategory === 'issues') {
            mapItems(
                searchResults?.issues,
                'issue',
                'fa-check-circle',
                'text-green-500',
                i => i.title,
                i => `${i.projectKey}-${i.id} • ${i.status}`,
                i => `/app/projects/${i.projectId}?issue=${i.id}`
            );
        }

        return results;
    }, [query, searchResults, activeCategory]);

    const results = getResults();
    const showQuickActions = !query.trim();
    const items = showQuickActions ? QUICK_ACTIONS : results;

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(i => Math.min(i + 1, items.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(i => Math.max(i - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (items[selectedIndex]) {
                        navigate(items[selectedIndex].path);
                        onClose();
                    }
                    break;
                case 'Escape':
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, items, selectedIndex, navigate, onClose]);

    // Reset selection when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [query, activeCategory]);

    if (!isOpen) return null;

    return (
        <div className="command-palette">
            <div className="command-palette-backdrop" onClick={onClose} />

            <div className="command-palette-content animate-in fade-in zoom-in-95 duration-150">
                {/* Search Input */}
                <div className="relative">
                    <i className="fa-solid fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Tìm kiếm nhân viên, dự án, công việc..."
                        className="command-palette-input pl-12"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">ESC</kbd>
                    </div>
                </div>

                {/* Category Filters */}
                <div className="flex gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${activeCategory === 'all'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        Tất cả
                    </button>
                    {SEARCH_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-1 ${activeCategory === cat.id
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'text-gray-500 hover:bg-gray-100'
                                }`}
                        >
                            <i className={`fa-solid ${cat.icon} ${cat.color} text-xs`} />
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Results */}
                <div className="command-palette-results">
                    {showQuickActions && (
                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                            Thao tác nhanh
                        </div>
                    )}

                    {items.length === 0 && query && (
                        <div className="px-4 py-8 text-center text-gray-400">
                            <i className="fa-solid fa-search text-2xl mb-2" />
                            <p>Không tìm thấy kết quả cho "{query}"</p>
                        </div>
                    )}

                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            onClick={() => {
                                navigate(item.path);
                                onClose();
                            }}
                            className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                        >
                            <div className={`w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center ${item.color}`}>
                                <i className={`fa-solid ${item.icon}`} />
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-gray-900">{item.title || item.label}</div>
                                {item.subtitle && (
                                    <div className="text-sm text-gray-500">{item.subtitle}</div>
                                )}
                            </div>
                            <i className="fa-solid fa-arrow-right text-gray-300" />
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                    <div className="flex gap-4">
                        <span><kbd className="px-1 py-0.5 bg-white rounded border text-[10px]">↑↓</kbd> Di chuyển</span>
                        <span><kbd className="px-1 py-0.5 bg-white rounded border text-[10px]">↵</kbd> Chọn</span>
                    </div>
                    <span>
                        <kbd className="px-1 py-0.5 bg-white rounded border text-[10px]">⌘K</kbd> để mở
                    </span>
                </div>
            </div>
        </div>
    );
}

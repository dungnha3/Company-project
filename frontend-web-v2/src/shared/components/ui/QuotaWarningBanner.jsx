import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

/**
 * QuotaWarningBanner - Displays upgrade prompts when quota reaches WARNING or CRITICAL level
 * 
 * Backend QuotaService returns a flat object:
 * {
 *   employees: { name, used, max, level, percentage },
 *   projects: { ... },
 *   storage: { ... }
 * }
 */
export default function QuotaWarningBanner() {
    const { workspaceType } = useWorkspaceStore();
    const isCompanyWorkspace = workspaceType === 'COMPANY';

    const { data: quota } = useQuery({
        queryKey: ['quota-banner'],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.COMPANIES.QUOTA);
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        retry: 1,
        enabled: isCompanyWorkspace, // Only fetch for Company Workspace
    });

    // Validate data structure
    if (!quota || !quota.employees) return null;

    // Transform to array
    // Note: Backend returns keys like 'employees', 'projects', 'storage'
    const items = [quota.employees, quota.projects, quota.storage].filter(Boolean);

    // Calculate overall level
    let isCritical = false;
    let isWarning = false;

    for (const item of items) {
        if (item.level === 'CRITICAL') isCritical = true;
        if (item.level === 'WARNING') isWarning = true;
    }

    if (!isCritical && !isWarning) return null;

    // Prioritize Critical over Warning
    const currentLevel = isCritical ? 'CRITICAL' : 'WARNING';

    // Find problem items
    const problemItems = items.filter(item =>
        (isCritical && item.level === 'CRITICAL') ||
        (!isCritical && item.level === 'WARNING')
    );

    const itemNames = problemItems.map(item => {
        const nameMap = {
            employees: 'thành viên',
            projects: 'dự án',
            storage: 'lưu trữ',
        };
        // Handle case where item.name might differ from key
        return nameMap[item.name] || nameMap[item.key] || item.name;
    }).join(', ');

    return (
        <div
            className={`
                px-4 py-3 text-center text-sm flex items-center justify-center gap-2
                ${isCritical
                    ? 'bg-red-50 text-red-800 border-b border-red-200'
                    : 'bg-yellow-50 text-yellow-800 border-b border-yellow-200'
                }
            `}
        >
            <span className="shrink-0">
                {isCritical ? '🚨' : '⚠️'}
            </span>
            <span>
                {isCritical
                    ? `Bạn đã đạt giới hạn ${itemNames}. Một số tính năng có thể bị hạn chế.`
                    : `Bạn đang gần đạt giới hạn ${itemNames}.`
                }
            </span>
            <Link
                to="/app/company/billing"
                className={`
                    ml-2 font-medium underline hover:no-underline shrink-0
                    ${isCritical ? 'text-red-900' : 'text-yellow-900'}
                `}
            >
                Nâng cấp ngay
            </Link>
        </div>
    );
}

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

/**
 * QuotaWarningBanner - Displays upgrade prompts when quota reaches WARNING or CRITICAL level
 * 
 * Backend QuotaService returns:
 * {
 *   items: [{ name, used, limit, percentage, level: 'OK'|'WARNING'|'CRITICAL' }],
 *   overallLevel: 'OK'|'WARNING'|'CRITICAL'
 * }
 */
export default function QuotaWarningBanner() {
    const { data: quota } = useQuery({
        queryKey: ['quota-banner'],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.COMPANIES.QUOTA);
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        retry: 1,
    });

    // Don't show if no data or quota is OK
    if (!quota || quota.overallLevel === 'OK') return null;

    const isWarning = quota.overallLevel === 'WARNING';
    const isCritical = quota.overallLevel === 'CRITICAL';

    // Find which quota items are at warning/critical level
    const problemItems = quota.items?.filter(item =>
        item.level === 'WARNING' || item.level === 'CRITICAL'
    ) || [];

    const itemNames = problemItems.map(item => {
        const nameMap = {
            members: 'thành viên',
            projects: 'dự án',
            storage: 'lưu trữ',
        };
        return nameMap[item.name] || item.name;
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

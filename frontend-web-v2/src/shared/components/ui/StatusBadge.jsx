import { STATUS_COLORS } from '../../constants/statusColors';

/**
 * StatusBadge — hiển thị status với màu sắc từ STATUS_COLORS constant.
 * 
 * @param {string} status - e.g. 'IN_PROGRESS', 'DONE', 'TODO'
 * @param {string} [label] - custom label, nếu không có thì dùng status
 * @param {'sm'|'md'} [size='md'] - size variant
 * @param {string} [className] - extra classes
 */
export default function StatusBadge({ status, label, size = 'md', className = '' }) {
    const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
    const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs';
    const displayLabel = label || status?.replace(/_/g, ' ') || 'Unknown';

    return (
        <span
            className={`inline-flex items-center ${sizeClass} rounded-full font-medium ${colorClass} ${className}`}
            aria-label={`Status: ${displayLabel}`}
        >
            {displayLabel}
        </span>
    );
}

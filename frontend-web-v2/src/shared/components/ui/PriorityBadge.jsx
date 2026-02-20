import { PRIORITY_COLORS, PRIORITY_ICONS } from '../../constants/statusColors';

/**
 * PriorityBadge — hiển thị priority với icon và màu sắc.
 * 
 * @param {'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'} priority
 * @param {boolean} [showLabel=false] - hiển thị text label bên cạnh icon
 * @param {string} [className]
 */
export default function PriorityBadge({ priority, showLabel = false, className = '' }) {
    const colorClass = PRIORITY_COLORS[priority] || 'text-gray-500';
    const iconClass = PRIORITY_ICONS[priority] || 'fa-minus';
    const label = priority ? priority.charAt(0) + priority.slice(1).toLowerCase() : 'None';

    return (
        <span
            className={`inline-flex items-center gap-1 font-medium ${colorClass} ${className}`}
            aria-label={`Priority: ${label}`}
            title={label}
        >
            <i className={`fas ${iconClass} text-xs`} aria-hidden="true" />
            {showLabel && <span className="text-xs">{label}</span>}
        </span>
    );
}

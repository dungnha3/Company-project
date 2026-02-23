import { SEMANTIC_COLORS } from '../../constants/colorMaps';

/**
 * UnifiedStatCard — stat card thống nhất dùng SEMANTIC_COLORS.
 * 
 * @param {string} icon - FontAwesome icon class, e.g. 'fa-users'
 * @param {string} label
 * @param {string|number} value
 * @param {'indigo'|'green'|'purple'|'red'|'yellow'|'cyan'|'orange'|'gray'} [color='indigo']
 * @param {string} [trend] - e.g. '+12%' hoặc '-5%'
 * @param {boolean} [trending] - true = up (green), false = down (red)
 * @param {Function} [onClick]
 * @param {string} [className]
 */
export default function UnifiedStatCard({
    icon,
    label,
    value,
    color = 'indigo',
    trend,
    trending,
    onClick,
    className = '',
}) {
    const colors = SEMANTIC_COLORS[color] || SEMANTIC_COLORS.indigo;

    return (
        <div
            className={`stat-card ${onClick ? 'cursor-pointer' : ''} ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyPress={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
        >
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center`}>
                    <i className={`fas ${icon} ${colors.text}`} aria-hidden="true" />
                </div>
                {trend && (
                    <span className={`text-xs font-semibold flex items-center gap-1 ${trending === true ? 'text-green-600' : trending === false ? 'text-red-500' : 'text-gray-500'
                        }`}>
                        {trending === true && <i className="fas fa-arrow-up text-xs" aria-hidden="true" />}
                        {trending === false && <i className="fas fa-arrow-down text-xs" aria-hidden="true" />}
                        {trend}
                    </span>
                )}
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">{value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        </div>
    );
}

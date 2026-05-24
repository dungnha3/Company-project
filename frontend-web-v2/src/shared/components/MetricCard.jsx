/**
 * MetricCard - Reusable metric display card (Minimalist style)
 */
export default function MetricCard({
    title,
    value,
    subtitle,
    icon,
    color = 'gray', // 'gray' | 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'primary'
    trend,
    trendDirection, // 'up' | 'down' | 'neutral'
    onClick,
    className = '',
    size = 'md', // 'sm' | 'md' | 'lg'
}) {
    // Minimalist color map - only accent color for emphasis
    const colorMap = {
        gray: {
            iconBg: 'bg-gray-100',
            iconText: 'text-gray-500',
            valueText: 'text-gray-900',
        },
        green: {
            iconBg: 'bg-green-50',
            iconText: 'text-green-600',
            valueText: 'text-gray-900',
        },
        red: {
            iconBg: 'bg-red-50',
            iconText: 'text-red-600',
            valueText: 'text-gray-900',
        },
        amber: {
            iconBg: 'bg-amber-50',
            iconText: 'text-amber-600',
            valueText: 'text-gray-900',
        },
        blue: {
            iconBg: 'bg-blue-50',
            iconText: 'text-blue-600',
            valueText: 'text-gray-900',
        },
        purple: {
            iconBg: 'bg-purple-50',
            iconText: 'text-purple-600',
            valueText: 'text-gray-900',
        },
        primary: {
            iconBg: 'bg-indigo-50',
            iconText: 'text-indigo-600',
            valueText: 'text-gray-900',
        },
    };

    const cls = colorMap[color] || colorMap.gray;

    const sizeMap = {
        sm: { padding: 'p-3', iconSize: 'w-8 h-8 text-xs', valueSize: 'text-lg', titleSize: 'text-[10px]' },
        md: { padding: 'p-4', iconSize: 'w-10 h-10 text-sm', valueSize: 'text-xl', titleSize: 'text-[10px]' },
        lg: { padding: 'p-5', iconSize: 'w-12 h-12 text-base', valueSize: 'text-2xl', titleSize: 'text-xs' },
    };

    const s = sizeMap[size] || sizeMap.md;

    // Minimalist trend styling
    const trendMap = {
        up: { text: 'text-green-600', icon: 'fa-arrow-up' },
        down: { text: 'text-red-600', icon: 'fa-arrow-down' },
        neutral: { text: 'text-gray-400', icon: 'fa-minus' },
    };

    const trendCls = trendDirection ? trendMap[trendDirection] : null;

    return (
        <div
            className={`
                bg-white rounded-xl ${s.padding}
                border border-gray-100
                flex items-center gap-3
                ${onClick ? 'cursor-pointer hover:shadow-sm hover:border-gray-200 transition-all' : ''}
                ${className}
            `}
            onClick={onClick}
        >
            {icon && (
                <div className={`${s.iconSize} rounded-lg ${cls.iconBg} flex items-center justify-center ${cls.iconText} shrink-0`}>
                    <i className={`fa-solid ${icon}`} />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className={`${s.titleSize} uppercase tracking-wider font-medium ${cls.iconText} opacity-70`}>
                    {title}
                </p>
                <div className="flex items-baseline gap-2">
                    <p className={`${s.valueSize} font-bold leading-tight ${cls.valueText}`}>
                        {value}
                    </p>
                    {trend !== undefined && trendCls && (
                        <span className={`text-xs font-medium ${trendCls.text}`}>
                            <i className={`fa-solid ${trendCls.icon} text-[8px] mr-0.5`} />
                            {typeof trend === 'number' ? `${trend > 0 ? '+' : ''}${trend}%` : trend}
                        </span>
                    )}
                </div>
                {subtitle && (
                    <p className="text-[10px] opacity-60 mt-0.5">{subtitle}</p>
                )}
            </div>
        </div>
    );
}

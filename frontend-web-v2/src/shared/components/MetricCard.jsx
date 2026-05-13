/**
 * MetricCard - Reusable metric display card
 * Used in: MyWorkPage, ProjectDashboard, HRDashboard, various overview pages
 */
export default function MetricCard({
    title,
    value,
    subtitle,
    icon,
    color = 'indigo', // 'indigo' | 'green' | 'red' | 'amber' | 'teal' | 'purple' | 'slate'
    trend,
    trendDirection, // 'up' | 'down' | 'neutral'
    onClick,
    className = '',
    size = 'md', // 'sm' | 'md' | 'lg'
}) {
    const colorMap = {
        indigo: {
            bg: 'bg-indigo-50',
            border: 'border-indigo-100',
            text: 'text-indigo-700',
            iconBg: 'bg-indigo-100',
            iconText: 'text-indigo-600',
        },
        green: {
            bg: 'bg-green-50',
            border: 'border-green-100',
            text: 'text-green-700',
            iconBg: 'bg-green-100',
            iconText: 'text-green-600',
        },
        red: {
            bg: 'bg-red-50',
            border: 'border-red-100',
            text: 'text-red-700',
            iconBg: 'bg-red-100',
            iconText: 'text-red-600',
        },
        amber: {
            bg: 'bg-amber-50',
            border: 'border-amber-100',
            text: 'text-amber-700',
            iconBg: 'bg-amber-100',
            iconText: 'text-amber-600',
        },
        teal: {
            bg: 'bg-teal-50',
            border: 'border-teal-100',
            text: 'text-teal-700',
            iconBg: 'bg-teal-100',
            iconText: 'text-teal-600',
        },
        purple: {
            bg: 'bg-purple-50',
            border: 'border-purple-100',
            text: 'text-purple-700',
            iconBg: 'bg-purple-100',
            iconText: 'text-purple-600',
        },
        slate: {
            bg: 'bg-slate-50',
            border: 'border-slate-100',
            text: 'text-slate-700',
            iconBg: 'bg-slate-100',
            iconText: 'text-slate-600',
        },
    };

    const cls = colorMap[color] || colorMap.indigo;

    const sizeMap = {
        sm: { padding: 'p-2', iconSize: 'w-7 h-7 text-xs', valueSize: 'text-lg', titleSize: 'text-[10px]' },
        md: { padding: 'p-3', iconSize: 'w-9 h-9 text-sm', valueSize: 'text-xl', titleSize: 'text-[10px]' },
        lg: { padding: 'p-4', iconSize: 'w-11 h-11 text-base', valueSize: 'text-2xl', titleSize: 'text-xs' },
    };

    const s = sizeMap[size] || sizeMap.md;

    const trendMap = {
        up: { text: 'text-green-600', icon: 'fa-arrow-up' },
        down: { text: 'text-red-600', icon: 'fa-arrow-down' },
        neutral: { text: 'text-gray-400', icon: 'fa-minus' },
    };

    const trendCls = trendDirection ? trendMap[trendDirection] : null;

    return (
        <div
            className={`
                rounded-xl border ${cls.bg} ${cls.border} ${s.padding}
                flex items-center gap-3
                ${onClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}
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
                <p className={`${s.titleSize} uppercase tracking-wider font-semibold opacity-70 ${cls.text}`}>
                    {title}
                </p>
                <div className="flex items-baseline gap-2">
                    <p className={`${s.valueSize} font-black leading-tight ${cls.text}`}>
                        {value}
                    </p>
                    {trend !== undefined && trendCls && (
                        <span className={`text-xs font-semibold ${trendCls.text}`}>
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

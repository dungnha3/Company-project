/**
 * PageHeader - Reusable page header component
 * Matches Stitch design system: title, subtitle, badge, action buttons
 */

export default function PageHeader({
    title,
    subtitle,
    icon,
    badge,
    actions,
    backTo,
    className = '',
}) {
    return (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
            <div className="flex items-center gap-4">
                {icon && (
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <i className={`fa-solid ${icon} text-primary text-lg`} />
                    </div>
                )}
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                        {badge && (
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${badge.className || 'bg-primary/10 text-primary'}`}>
                                {badge.label}
                            </span>
                        )}
                    </div>
                    {subtitle && (
                        <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>
                    )}
                </div>
            </div>

            {actions && (
                <div className="flex items-center gap-3 shrink-0">
                    {Array.isArray(actions) ? actions.map((action, i) => (
                        <div key={i}>{action}</div>
                    )) : actions}
                </div>
            )}
        </div>
    );
}

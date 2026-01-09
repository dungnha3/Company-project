/**
 * ContentLayout - Wrapper layout for content pages with header
 */
export default function ContentLayout({ title, subtitle, actions, children }) {
    return (
        <div className="space-y-6">
            {/* Header */}
            {(title || actions) && (
                <div className="flex items-center justify-between">
                    <div>
                        {title && (
                            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
                        )}
                        {subtitle && (
                            <p className="text-gray-500 mt-1">{subtitle}</p>
                        )}
                    </div>
                    {actions && (
                        <div className="flex gap-3">{actions}</div>
                    )}
                </div>
            )}

            {/* Content */}
            <div>{children}</div>
        </div>
    );
}

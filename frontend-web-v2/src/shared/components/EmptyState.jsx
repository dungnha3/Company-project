/**
 * EmptyState - Reusable empty state component
 * Matches Stitch UI Micro-states Design System
 */

export default function EmptyState({
    icon = 'fa-inbox',
    title = 'Chưa có dữ liệu',
    description = '',
    action = null,
    size = 'md',
    className = '',
}) {
    const sizes = {
        sm: { wrapper: 'py-10', icon: 'text-4xl', iconBg: 'w-14 h-14', title: 'text-base', desc: 'text-sm' },
        md: { wrapper: 'py-16', icon: 'text-5xl', iconBg: 'w-20 h-20', title: 'text-lg', desc: 'text-sm' },
        lg: { wrapper: 'py-24', icon: 'text-6xl', iconBg: 'w-24 h-24', title: 'text-xl', desc: 'text-base' },
    };
    const s = sizes[size] || sizes.md;

    return (
        <div className={`flex flex-col items-center justify-center text-center ${s.wrapper} ${className}`}>
            <div className={`${s.iconBg} bg-gray-100 rounded-2xl flex items-center justify-center mb-5`}>
                <i className={`fa-solid ${icon} ${s.icon} text-gray-400`} />
            </div>
            <h3 className={`${s.title} font-semibold text-gray-800 mb-2`}>{title}</h3>
            {description && (
                <p className={`${s.desc} text-gray-500 max-w-sm mb-5`}>{description}</p>
            )}
            {action && (
                <div className="flex gap-3 justify-center">
                    {Array.isArray(action) ? action : action}
                </div>
            )}
        </div>
    );
}

// Pre-built variants for common cases
export function EmptyEmployees({ onAdd }) {
    return (
        <EmptyState
            icon="fa-users"
            title="Chưa có nhân viên nào"
            description="Bắt đầu bằng cách tạo hồ sơ nhân viên đầu tiên."
            action={onAdd && (
                <button onClick={onAdd} className="btn-primary">
                    <i className="fa-solid fa-plus mr-2" />Tạo hồ sơ nhân viên
                </button>
            )}
        />
    );
}

export function EmptyNotifications() {
    return (
        <EmptyState
            icon="fa-bell-slash"
            title="Không có thông báo"
            description="Bạn đã đọc hết tất cả thông báo rồi!"
        />
    );
}

export function EmptySearch({ keyword }) {
    return (
        <EmptyState
            icon="fa-search"
            title="Không tìm thấy kết quả"
            description={keyword ? `Không có kết quả cho "${keyword}". Thử từ khóa khác nhé.` : 'Thử tìm kiếm với từ khóa khác.'}
            size="sm"
        />
    );
}

export function EmptyProjects({ onAdd }) {
    return (
        <EmptyState
            icon="fa-folder-open"
            title="Chưa có dự án nào"
            description="Tạo dự án đầu tiên để bắt đầu quản lý công việc nhóm."
            action={onAdd && (
                <button onClick={onAdd} className="btn-primary">
                    <i className="fa-solid fa-plus mr-2" />Tạo dự án
                </button>
            )}
        />
    );
}

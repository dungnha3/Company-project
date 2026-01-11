/**
 * Empty State Components
 * Display when lists/tables have no data
 */

// Generic empty state with customizable icon and message
export function EmptyState({
    icon = 'fa-inbox',
    title = 'Không có dữ liệu',
    description = 'Chưa có nội dung để hiển thị',
    action = null,
    className = '',
}) {
    return (
        <div className={`flex flex-col items-center justify-center py-16 px-4 animate-fade-in ${className}`}>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center mb-6">
                <i className={`fa-solid ${icon} text-3xl text-gray-400 dark:text-gray-500`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">{description}</p>
            {action}
        </div>
    );
}

// Empty inbox - for empty task/issue lists
export function EmptyInbox({ onAction, actionLabel = 'Tạo mới' }) {
    return (
        <EmptyState
            icon="fa-inbox"
            title="Hộp thư trống"
            description="Các công việc và thông báo sẽ xuất hiện ở đây"
            action={
                onAction && (
                    <button
                        onClick={onAction}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all hover:-translate-y-0.5 hover:shadow-glow"
                    >
                        <i className="fa-solid fa-plus mr-2" />
                        {actionLabel}
                    </button>
                )
            }
        />
    );
}

// Empty projects - for no projects
export function EmptyProjects({ onAction }) {
    return (
        <EmptyState
            icon="fa-folder-open"
            title="Chưa có dự án nào"
            description="Bắt đầu bằng cách tạo dự án đầu tiên của bạn"
            action={
                onAction && (
                    <button
                        onClick={onAction}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all hover:-translate-y-0.5 hover:shadow-glow"
                    >
                        <i className="fa-solid fa-folder-plus mr-2" />
                        Tạo dự án
                    </button>
                )
            }
        />
    );
}

// Empty search results
export function EmptySearch({ query = '' }) {
    return (
        <EmptyState
            icon="fa-search"
            title="Không tìm thấy kết quả"
            description={query ? `Không có kết quả nào cho "${query}"` : 'Thử tìm kiếm với từ khóa khác'}
        />
    );
}

// Empty sprints
export function EmptySprints({ onAction }) {
    return (
        <EmptyState
            icon="fa-layer-group"
            title="Chưa có sprint nào"
            description="Tạo sprint để bắt đầu quản lý công việc theo chu kỳ"
            action={
                onAction && (
                    <button
                        onClick={onAction}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all hover:-translate-y-0.5"
                    >
                        <i className="fa-solid fa-plus mr-2" />
                        Tạo Sprint
                    </button>
                )
            }
        />
    );
}

// Empty comments
export function EmptyComments() {
    return (
        <EmptyState
            icon="fa-comments"
            title="Chưa có bình luận"
            description="Hãy là người đầu tiên bình luận"
            className="py-8"
        />
    );
}

// Empty activity log
export function EmptyActivity() {
    return (
        <EmptyState
            icon="fa-history"
            title="Chưa có hoạt động"
            description="Các thay đổi sẽ được ghi lại ở đây"
            className="py-8"
        />
    );
}

export default {
    Generic: EmptyState,
    Inbox: EmptyInbox,
    Projects: EmptyProjects,
    Search: EmptySearch,
    Sprints: EmptySprints,
    Comments: EmptyComments,
    Activity: EmptyActivity,
};

import { flexRender } from '@tanstack/react-table';

export default function DataTable({
    table,
    loading,
    columns,
    data,
    totalCount,
    pagination,
    onPaginationChange,
    error,
    onRetry
}) {
    if (loading) {
        return (
            <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="animate-pulse">
                    <div className="h-12 bg-gray-50 border-b border-gray-100"></div>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 border-b border-gray-100 bg-white"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden p-12 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400">
                    <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
                </div>
                <h3 className="color-main font-semibold mb-1">Không thể tải dữ liệu</h3>
                <p className="color-slate text-sm mb-4">Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.</p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                        <i className="fa-solid fa-rotate mr-2" />
                        Thử lại
                    </button>
                )}
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <i className="fa-solid fa-inbox text-2xl"></i>
                </div>
                <h3 className="color-main font-semibold mb-1">Không có dữ liệu</h3>
                <p className="color-slate text-sm">Chưa có bản ghi nào được tìm thấy.</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[800px]">
                    <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[11px] border-b border-gray-100">
                        <tr>
                            {columns.map((column, idx) => (
                                <th key={idx} className="px-4 py-3 whitespace-nowrap">
                                    {typeof column.header === 'function' ? column.header() : column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((row, rowIdx) => (
                            <tr key={row.id ?? rowIdx} className="hover:bg-gray-50/50 transition-colors">
                                {columns.map((column, idx) => (
                                    <td key={idx} className={`px-4 py-3 align-middle ${idx === columns.length - 1 ? 'text-right' : ''}`}>
                                        {column.cell ? column.cell(row) : (row[column.accessorKey] || '-')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {(pagination && totalCount > 0) && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="text-sm color-slate">
                        Hiển thị <b>{(pagination.pageIndex * pagination.pageSize) + 1}</b> - <b>{Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)}</b> trên tổng <b>{totalCount}</b>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => onPaginationChange({ ...pagination, pageIndex: Math.max(0, pagination.pageIndex - 1) })}
                            disabled={pagination.pageIndex === 0}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm color-slate hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Trước
                        </button>
                        <button
                            onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex + 1 })}
                            disabled={(pagination.pageIndex + 1) * pagination.pageSize >= totalCount}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm color-slate hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

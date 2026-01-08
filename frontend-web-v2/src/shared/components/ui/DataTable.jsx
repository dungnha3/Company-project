import { flexRender } from '@tanstack/react-table';

export default function DataTable({
    table,
    loading,
    columns,
    data,
    totalCount,
    pagination,
    onPaginationChange
}) {
    if (loading) {
        return (
            <div className="w-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="animate-pulse">
                    <div className="h-12 bg-gray-50 border-b border-gray-100"></div>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 border-b border-gray-50 bg-white"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <i className="fa-solid fa-inbox text-2xl"></i>
                </div>
                <h3 className="text-gray-900 font-medium mb-1">Không có dữ liệu</h3>
                <p className="text-gray-500 text-sm">Chưa có bản ghi nào được tìm thấy.</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs border-b border-gray-100">
                        <tr>
                            {columns.map((column, idx) => (
                                <th key={idx} className="px-6 py-4 whitespace-nowrap">
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                {columns.map((column, idx) => (
                                    <td key={idx} className="px-6 py-4 align-middle">
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
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
                    <div className="text-sm text-gray-500">
                        Hiển thị <b>{(pagination.pageIndex * pagination.pageSize) + 1}</b> - <b>{Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)}</b> trên tổng <b>{totalCount}</b>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => onPaginationChange({ ...pagination, pageIndex: Math.max(0, pagination.pageIndex - 1) })}
                            disabled={pagination.pageIndex === 0}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Trước
                        </button>
                        <button
                            onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex + 1 })}
                            disabled={(pagination.pageIndex + 1) * pagination.pageSize >= totalCount}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

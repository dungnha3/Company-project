import { useState } from 'react';

export default function AdminAnalyticsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Thống kê hệ thống</h1>
            <p className="text-gray-500">Báo cáo chi tiết về hoạt động của toàn bộ hệ thống SaaS.</p>

            {/* Placeholder Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-semibold mb-4">Lượng truy cập (Traffic)</h3>
                    <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                        Chart Area
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-semibold mb-4">Tài nguyên sử dụng</h3>
                    <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                        Chart Area
                    </div>
                </div>
            </div>
        </div>
    );
}

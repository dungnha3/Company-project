import { Link } from 'react-router-dom';

export default function MyPerformancePage() {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-8 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                        <i className="fa-solid fa-chart-line text-lg" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Hiệu suất của tôi
                        </h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-300">
                            Trang hiệu suất cá nhân đã được mở route thành công. Bạn sẽ không còn bị chuyển về landing khi bấm từ menu.
                        </p>
                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                            Dữ liệu KPI cá nhân đang được đồng bộ theo API backend hiện có.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                to="/app/me/issues"
                                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
                            >
                                Xem công việc của tôi
                            </Link>
                            <Link
                                to="/app/me/timelogs"
                                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Xem nhật ký giờ làm
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

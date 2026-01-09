import { Link } from 'react-router-dom';
import { getPlanConfig } from '@shared/utils/planHelper';

/**
 * UpgradePrompt - Modal hiển thị khi user cố dùng feature locked
 */
export default function UpgradePrompt({
    feature,
    requiredPlan = 'STARTER',
    onClose
}) {
    const planConfig = getPlanConfig(requiredPlan);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="fa-solid fa-lock text-2xl" />
                    </div>
                    <h3 className="text-xl font-bold">Tính năng Premium</h3>
                </div>

                {/* Body */}
                <div className="p-6 text-center">
                    <p className="text-gray-600 mb-4">
                        <strong className="text-gray-800">{feature}</strong> là tính năng
                        yêu cầu gói <strong className="text-primary">{planConfig.name}</strong> trở lên.
                    </p>

                    {/* Plan benefits */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                            Gói {planConfig.name} bao gồm:
                        </p>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li className="flex items-center gap-2">
                                <i className="fa-solid fa-check text-green-500 text-xs" />
                                {planConfig.maxUsers === -1 ? 'Unlimited' : planConfig.maxUsers} thành viên
                            </li>
                            <li className="flex items-center gap-2">
                                <i className="fa-solid fa-check text-green-500 text-xs" />
                                {planConfig.maxProjects === -1 ? 'Unlimited' : planConfig.maxProjects} dự án
                            </li>
                            <li className="flex items-center gap-2">
                                <i className="fa-solid fa-check text-green-500 text-xs" />
                                {planConfig.storageGB === -1 ? 'Unlimited' : planConfig.storageGB + 'GB'} lưu trữ
                            </li>
                            {planConfig.features.hr && (
                                <li className="flex items-center gap-2">
                                    <i className="fa-solid fa-check text-green-500 text-xs" />
                                    Module HR (Chấm công, Lương, Nghỉ phép)
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                        >
                            Để sau
                        </button>
                        <Link
                            to="/pricing"
                            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-rocket" />
                            Nâng cấp ngay
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

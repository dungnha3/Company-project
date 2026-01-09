/**
 * UsageBanner - Hiển thị warning khi gần đạt hoặc đạt limit
 */
export default function UsageBanner({
    current,
    max,
    label,
    warningThreshold = 0.8
}) {
    // Hide for unlimited
    if (max === -1) return null;

    const percentage = current / max;
    const isWarning = percentage >= warningThreshold;
    const isFull = current >= max;

    // Only show when warning or full
    if (!isWarning) return null;

    return (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm ${isFull
                ? 'bg-red-50 border border-red-100 text-red-700'
                : 'bg-amber-50 border border-amber-100 text-amber-700'
            }`}>
            <div className="flex items-center gap-2">
                <i className={`fa-solid ${isFull ? 'fa-circle-exclamation' : 'fa-triangle-exclamation'
                    }`} />
                <span>
                    {isFull
                        ? `Đã đạt giới hạn ${label} (${current}/${max})`
                        : `Sắp đạt giới hạn ${label}: ${current}/${max}`
                    }
                </span>
            </div>
            <a
                href="/pricing"
                className={`font-medium underline ${isFull ? 'text-red-800' : 'text-amber-800'
                    }`}
            >
                Nâng cấp
            </a>
        </div>
    );
}

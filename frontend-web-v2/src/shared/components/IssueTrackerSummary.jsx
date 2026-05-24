import { formatNumber } from '@shared/utils/formatters';

/**
 * Per-issue Estimated / Logged / Remaining summary with progress bars.
 * Used in MyPerformancePage timelogs tab.
 */
export default function IssueTrackerSummary({ issueSummaries }) {
    if (!issueSummaries || issueSummaries.length === 0) return null;

    return (
        <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <i className="fa-solid fa-chart-pie text-indigo-400" />
                Theo dõi theo Issue
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {issueSummaries.map(summary => {
                    const progress = summary.estimatedHours > 0
                        ? Math.min((summary.loggedHours / summary.estimatedHours) * 100, 100)
                        : null;
                    const remaining = Math.max(0, summary.estimatedHours - summary.loggedHours);
                    const isOver = summary.loggedHours > summary.estimatedHours;

                    return (
                        <div key={summary.issueId} className="bg-white rounded-xl border border-gray-100 p-4 hover:border-indigo-200 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold shrink-0">
                                            {summary.issueKey}
                                        </span>
                                        {summary.statusName && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                                summary.statusName === 'Done' ? 'bg-green-100 text-green-700' :
                                                summary.statusName === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                                summary.statusName === 'Review' ? 'bg-purple-100 text-purple-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {summary.statusName}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-gray-700 truncate pr-2" title={summary.title}>
                                        {summary.title}
                                    </p>
                                </div>
                                {summary.totalScore != null && (
                                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                        Number(summary.totalScore) >= 8 ? 'bg-green-100 text-green-700' :
                                        Number(summary.totalScore) >= 6 ? 'bg-amber-100 text-amber-700' :
                                        'bg-red-100 text-red-600'
                                    }`}>
                                        {Number(summary.totalScore).toFixed(1)}
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-1.5 mb-2.5">
                                <div className="flex-1 text-center bg-gray-50 rounded-lg py-1.5">
                                    <div className="text-[10px] text-gray-400 font-semibold uppercase">Est.</div>
                                    <div className="text-xs font-bold text-gray-600">{formatNumber(summary.estimatedHours || 0, { maximumFractionDigits: 1 })}h</div>
                                </div>
                                <div className="flex-1 text-center bg-gray-50 rounded-lg py-1.5">
                                    <div className="text-[10px] text-gray-400 font-semibold uppercase">Logged</div>
                                    <div className={`text-xs font-bold ${isOver ? 'text-red-500' : 'text-green-600'}`}>
                                        {formatNumber(summary.loggedHours, { maximumFractionDigits: 1 })}h
                                    </div>
                                </div>
                                <div className="flex-1 text-center bg-gray-50 rounded-lg py-1.5">
                                    <div className="text-[10px] text-gray-400 font-semibold uppercase">Remain</div>
                                    <div className={`text-xs font-bold ${remaining === 0 ? 'text-gray-400' : 'text-amber-600'}`}>
                                        {isOver ? (
                                            <span className="text-red-400 text-[10px]">+{(summary.loggedHours - summary.estimatedHours).toFixed(1)}h</span>
                                        ) : (
                                            formatNumber(remaining, { maximumFractionDigits: 1 }) + 'h'
                                        )}
                                    </div>
                                </div>
                            </div>

                            {summary.estimatedHours > 0 && (
                                <div className="space-y-1">
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                progress > 100 ? 'bg-gradient-to-r from-amber-500 to-red-500' :
                                                progress > 80 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                                                'bg-gradient-to-r from-indigo-400 to-purple-400'
                                            }`}
                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between">
                                        <span className={`text-[10px] font-semibold ${
                                            progress > 100 ? 'text-red-500' : progress > 80 ? 'text-amber-500' : 'text-gray-400'
                                        }`}>
                                            {progress.toFixed(0)}% {progress > 100 ? 'quá' : 'hoàn thành'}
                                        </span>
                                        <span className="text-[10px] text-gray-400">{summary.logCount} log</span>
                                    </div>
                                </div>
                            )}

                            {(summary.aiScore != null || summary.humanScore != null) && (
                                <div className="flex gap-2 mt-2.5 pt-2 border-t border-gray-100">
                                    {summary.aiScore != null && (
                                        <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                                            AI: {Number(summary.aiScore).toFixed(1)}
                                        </span>
                                    )}
                                    {summary.humanScore != null && (
                                        <span className="text-[10px] font-semibold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">
                                            Human: {Number(summary.humanScore).toFixed(1)}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

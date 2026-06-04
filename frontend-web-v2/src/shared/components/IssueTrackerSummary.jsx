import { formatNumber } from '@shared/utils/formatters';

/**
 * Per-issue Logged summary cards.
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
                    return (
                        <div key={summary.issueId} className="bg-white rounded-xl border border-gray-100 p-4 hover:border-indigo-200 transition-all duration-200 flex flex-col justify-between shadow-sm">
                            <div>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="px-2 py-0.5 bg-indigo-100/10 text-indigo-700 rounded-md text-xs font-bold shrink-0">
                                                {summary.issueKey}
                                            </span>
                                            {summary.statusName && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                                    summary.statusName === 'Done' ? 'bg-green-150/10 text-green-700' :
                                                    summary.statusName === 'In Progress' ? 'bg-blue-150/10 text-blue-700' :
                                                    summary.statusName === 'Review' ? 'bg-purple-150/10 text-purple-700' :
                                                    'bg-gray-100 text-gray-650'
                                                }`}>
                                                    {summary.statusName}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm font-semibold text-gray-850 truncate pr-2 mt-1.5" title={summary.title}>
                                            {summary.title}
                                        </p>
                                    </div>
                                    {summary.totalScore != null && (
                                        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                            Number(summary.totalScore) >= 8 ? 'bg-green-100 text-green-700' :
                                            Number(summary.totalScore) >= 6 ? 'bg-amber-100 text-amber-700' :
                                            'bg-red-100 text-red-650'
                                        }`}>
                                            {Number(summary.totalScore).toFixed(1)}
                                        </span>
                                    )}
                                </div>

                                <div className="bg-indigo-50/45 rounded-xl p-3 border border-indigo-100/50 text-center mb-3">
                                    <span className="text-[10px] text-indigo-500 uppercase tracking-wider font-bold block mb-0.5">Thời gian thực tế đã log</span>
                                    <span className="text-xl font-black text-indigo-700">{formatNumber(summary.loggedHours, { maximumFractionDigits: 1 })}h</span>
                                    <span className="text-[10px] text-gray-400 block mt-0.5">{summary.logCount} lần log</span>
                                </div>
                            </div>

                            {(summary.aiScore != null || summary.humanScore != null) && (
                                <div className="flex gap-2 pt-2.5 border-t border-gray-100">
                                    {summary.aiScore != null && (
                                        <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/30">
                                            AI: {Number(summary.aiScore).toFixed(1)}
                                        </span>
                                    )}
                                    {summary.humanScore != null && (
                                        <span className="text-[10px] font-semibold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100/30">
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

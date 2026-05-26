import { useState } from 'react';

export default function InsightCard({ title, icon, children, className = '' }) {
    return (
        <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
            <div className="flex items-center gap-2 mb-3">
                {icon && <i className={`fa-solid ${icon} text-indigo-500`} />}
                {title && <h3 className="font-semibold text-gray-700">{title}</h3>}
            </div>
            {children}
        </div>
    );
}

export function ScoreBar({ value, max = 10, label, color = 'indigo' }) {
    const colorMap = {
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        orange: 'bg-orange-500',
        red: 'bg-red-500',
        indigo: 'bg-indigo-500',
        purple: 'bg-purple-500',
        pink: 'bg-pink-500',
        cyan: 'bg-cyan-500',
    };

    const pct = Math.min((value / max) * 100, 100);

    return (
        <div className="flex items-center gap-2">
            {label && <span className="text-xs text-gray-500 w-28">{label}</span>}
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${colorMap[color] || 'bg-indigo-500'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-10 text-right">
                {typeof value === 'number' ? value : value}
            </span>
        </div>
    );
}

export function RiskBadge({ score, label }) {
    const getColor = (s) => {
        if (s >= 70) return 'bg-red-100 text-red-700';
        if (s >= 50) return 'bg-orange-100 text-orange-700';
        if (s >= 25) return 'bg-yellow-100 text-yellow-700';
        return 'bg-green-100 text-green-700';
    };

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getColor(score)}`}>
            {label}
        </span>
    );
}

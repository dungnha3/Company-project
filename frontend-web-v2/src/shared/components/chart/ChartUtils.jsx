import { useState, useCallback } from 'react';

// Standard dark tooltip contentStyle used across all charts
export const CHART_TOOLTIP_STYLE = {
    background: '#1e2937',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
};

// Format currency in tooltip
export function tooltipCurrencyFormatter(value) {
    if (value == null) return '—';
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ đ`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} triệu đ`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K đ`;
    return `${value.toLocaleString('vi-VN')} đ`;
}

// Standard Tooltip wrapper props
export function tooltipFormatterScore(v) {
    return [`${v} điểm`];
}

// Custom Pie active slice label (renders in center of donut chart)
export function PieActiveLabel({ active, payload, totalValue, formatter }) {
    if (!active || !payload || !payload.length) return null;
    const val = payload[0]?.value;
    const name = payload[0]?.name;
    if (val == null) return null;
    const pct = totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) : '0';
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-gray-900 leading-tight">{formatter ? formatter(val) : val.toLocaleString('vi-VN')}</span>
            <span className="text-xs text-gray-500 font-medium">{pct}%</span>
            <span className="text-[10px] text-gray-400 mt-0.5 max-w-[80px] text-center truncate">{name}</span>
        </div>
    );
}

// Interactive Legend component — click to toggle series visibility
export function InteractiveLegend({ payload, hiddenItems, onToggle }) {
    return (
        <div className="flex flex-wrap justify-center gap-3 mt-2">
            {payload.map((entry, index) => {
                const isHidden = hiddenItems?.has(entry.value);
                return (
                    <button
                        key={`legend-${index}`}
                        onClick={() => onToggle(entry.value)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                            isHidden ? 'opacity-40 line-through' : 'opacity-100 hover:bg-gray-100'
                        }`}
                    >
                        <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-gray-600">{entry.value}</span>
                    </button>
                );
            })}
        </div>
    );
}

// Hook for managing hidden legend items
export function useChartLegend(initialHidden = new Set()) {
    const [hiddenItems, setHiddenItems] = useState(initialHidden);
    const toggleItem = useCallback((item) => {
        setHiddenItems(prev => {
            const next = new Set(prev);
            if (next.has(item)) next.delete(item);
            else next.add(item);
            return next;
        });
    }, []);
    const showAll = useCallback(() => setHiddenItems(new Set()), []);
    return { hiddenItems, toggleItem, showAll };
}

import { useEffect, useState } from 'react';

const SHORTCUTS = [
    {
        category: 'Điều hướng', items: [
            { keys: ['G', 'H'], description: 'Đi đến HR Dashboard' },
            { keys: ['G', 'P'], description: 'Đi đến Dự án' },
            { keys: ['G', 'E'], description: 'Đi đến Nhân viên' },
            { keys: ['G', 'O'], description: 'Đi đến Sơ đồ tổ chức' },
        ]
    },
    {
        category: 'Tìm kiếm', items: [
            { keys: ['⌘', 'K'], description: 'Mở tìm kiếm nhanh' },
            { keys: ['Esc'], description: 'Đóng modal/tìm kiếm' },
        ]
    },
    {
        category: 'Khác', items: [
            { keys: ['?'], description: 'Hiển thị phím tắt' },
        ]
    },
];

export default function ShortcutsModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                            <i className="fa-solid fa-keyboard" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Phím tắt</h2>
                            <p className="text-xs text-gray-500">Điều hướng nhanh với bàn phím</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fa-solid fa-xmark text-xl" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    {SHORTCUTS.map(category => (
                        <div key={category.category}>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                {category.category}
                            </h3>
                            <div className="space-y-2">
                                {category.items.map((shortcut, i) => (
                                    <div key={i} className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-gray-50">
                                        <span className="text-gray-700">{shortcut.description}</span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, j) => (
                                                <span key={j}>
                                                    <kbd className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded border border-gray-200 font-mono">
                                                        {key}
                                                    </kbd>
                                                    {j < shortcut.keys.length - 1 && (
                                                        <span className="text-gray-400 mx-1">+</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-400">
                    Nhấn <kbd className="px-1 py-0.5 bg-white rounded border">?</kbd> bất kỳ lúc nào để xem phím tắt
                </div>
            </div>
        </div>
    );
}

// Hook to add keyboard shortcuts globally
export function useKeyboardShortcuts(navigate) {
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [keySequence, setKeySequence] = useState([]);

    useEffect(() => {
        let timeout;

        const handleKeyDown = (e) => {
            // Skip if in input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            // Show shortcuts modal with ?
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                setShowShortcuts(true);
                return;
            }

            // Clear sequence after 1 second
            clearTimeout(timeout);
            timeout = setTimeout(() => setKeySequence([]), 1000);

            const newSequence = [...keySequence, e.key.toUpperCase()];
            setKeySequence(newSequence);

            // Check for go-to shortcuts (G + letter)
            if (newSequence.length === 2 && newSequence[0] === 'G') {
                e.preventDefault();
                switch (newSequence[1]) {
                    case 'H':
                        navigate('/app/hr-dashboard');
                        break;
                    case 'P':
                        navigate('/app/projects');
                        break;
                    case 'E':
                        navigate('/app/employees');
                        break;
                    case 'O':
                        navigate('/app/org-chart');
                        break;
                    case 'I':
                        navigate('/app/my-issues');
                        break;
                    case 'C':
                        navigate('/app/calendar');
                        break;
                }
                setKeySequence([]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearTimeout(timeout);
        };
    }, [navigate, keySequence]);

    return {
        showShortcuts,
        setShowShortcuts,
        ShortcutsModal: () => <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />,
    };
}

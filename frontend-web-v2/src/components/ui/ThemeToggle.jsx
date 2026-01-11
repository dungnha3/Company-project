/**
 * Theme Toggle Button Component
 * Toggles between light/dark/system modes
 */
import useThemeStore from '@shared/stores/themeStore';

export default function ThemeToggle({ className = '' }) {
    const { theme, setTheme, toggleTheme } = useThemeStore();

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
            title={theme === 'dark' ? 'Chuyển sang sáng' : 'Chuyển sang tối'}
        >
            {theme === 'dark' ? (
                <i className="fa-solid fa-sun text-yellow-500" />
            ) : (
                <i className="fa-solid fa-moon text-gray-600" />
            )}
        </button>
    );
}

// Dropdown version with system option
export function ThemeDropdown({ className = '' }) {
    const { theme, setTheme } = useThemeStore();

    const options = [
        { value: 'light', label: 'Sáng', icon: 'fa-sun' },
        { value: 'dark', label: 'Tối', icon: 'fa-moon' },
        { value: 'system', label: 'Hệ thống', icon: 'fa-laptop' },
    ];

    return (
        <div className={`relative ${className}`}>
            <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="appearance-none px-4 py-2 pr-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
        </div>
    );
}

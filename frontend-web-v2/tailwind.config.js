/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#6366f1',
                    light: '#818cf8',
                    dark: '#4f46e5',
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                },
                secondary: {
                    DEFAULT: '#64748b',
                    light: '#94a3b8',
                    dark: '#475569',
                },
                success: '#22c55e',
                warning: '#f59e0b',
                danger: '#ef4444',
                glass: 'rgba(255, 255, 255, 0.85)',
            },
            boxShadow: {
                'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
                'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
                'sidebar': '4px 0 20px rgba(0, 0, 0, 0.05)',
            },
            backdropBlur: {
                'glass': '10px',
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}

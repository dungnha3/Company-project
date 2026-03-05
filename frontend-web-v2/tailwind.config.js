/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
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
                // Dark mode surface colors
                surface: {
                    light: '#ffffff',
                    dark: '#1e1e2e',
                    'dark-secondary': '#2a2a3d',
                },
            },
            boxShadow: {
                'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
                'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
                'sidebar': '4px 0 20px rgba(0, 0, 0, 0.05)',
                'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
                'glow-lg': '0 0 40px rgba(99, 102, 241, 0.4)',
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
            // Custom animations
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'fade-out': 'fadeOut 0.2s ease-out',
                'slide-up': 'slideUp 0.25s ease-out',
                'slide-down': 'slideDown 0.25s ease-out',
                'slide-left': 'slideLeft 0.25s ease-out',
                'slide-right': 'slideRight 0.25s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'scale-out': 'scaleOut 0.2s ease-out',
                'bounce-in': 'bounceIn 0.4s ease-out',
                'shake': 'shake 0.5s ease-in-out',
                'pulse-slow': 'pulse 3s infinite',
                'spin-slow': 'spin 3s linear infinite',
                'shimmer': 'shimmer 2s infinite linear',
                'kanban-pulse': 'kanbanPulse 3s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeOut: {
                    '0%': { opacity: '1' },
                    '100%': { opacity: '0' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(8px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-8px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideLeft: {
                    '0%': { transform: 'translateX(8px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                slideRight: {
                    '0%': { transform: 'translateX(-8px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                scaleOut: {
                    '0%': { transform: 'scale(1)', opacity: '1' },
                    '100%': { transform: 'scale(0.95)', opacity: '0' },
                },
                bounceIn: {
                    '0%': { transform: 'scale(0.9)', opacity: '0' },
                    '50%': { transform: 'scale(1.02)' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                shake: {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '25%': { transform: 'translateX(-4px)' },
                    '75%': { transform: 'translateX(4px)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                kanbanPulse: {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.1)' },
                    '50%': { boxShadow: '0 0 12px 2px rgba(239, 68, 68, 0.2)' },
                },
            },
        },
    },
    plugins: [],
}


/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Messenger-style primary blue
                messenger: {
                    DEFAULT: '#0084ff',
                    dark: '#0077e6',
                    light: '#69b4ff',
                },
                // Chat bubble colors
                bubble: {
                    own: '#0084ff',
                    other: '#E4E6EB',
                },
                // Clean backgrounds
                chat: {
                    bg: '#F9FAFB',
                    sidebar: '#FFFFFF',
                }
            },
            borderRadius: {
                'bubble': '18px',
                'modal': '16px',
                'input': '24px',
            },
            boxShadow: {
                'float': '0 2px 12px rgba(0, 0, 0, 0.08)',
                'modal': '0 8px 32px rgba(0, 0, 0, 0.12)',
            }
        },
    },
    plugins: [],
}

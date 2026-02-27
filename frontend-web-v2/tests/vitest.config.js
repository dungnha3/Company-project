import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: [path.resolve(__dirname, './setupTests.js')],
        css: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '../src'),
            '@components': path.resolve(__dirname, '../src/shared/components'),
            '@layouts': path.resolve(__dirname, '../src/app/layouts'),
            '@pages': path.resolve(__dirname, '../src/pages'),
            '@hooks': path.resolve(__dirname, '../src/shared/hooks'),
            '@utils': path.resolve(__dirname, '../src/shared/utils'),
            '@services': path.resolve(__dirname, '../src/shared/services'),
            '@assets': path.resolve(__dirname, '../src/assets'),
            '@shared': path.resolve(__dirname, '../src/shared'),
            '@app': path.resolve(__dirname, '../src/app'),
        },
    },
});

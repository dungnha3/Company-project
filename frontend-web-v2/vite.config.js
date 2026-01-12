import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Bundle analyzer - only when ANALYZE=true
const analyzePlugin = process.env.ANALYZE
  ? import('rollup-plugin-visualizer').then(m => m.visualizer({
    open: true,
    filename: 'dist/stats.html',
    gzipSize: true,
    brotliSize: true,
  }))
  : null;

export default defineConfig(async () => ({
  plugins: [
    react(),
    // Add analyzer in analyze mode
    analyzePlugin && await analyzePlugin,
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  define: {
    global: 'window',
  },
  build: {
    // Production optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.log in production
        drop_debugger: true, // Remove debugger statements
      },
    },
    sourcemap: false, // Disable for production security
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - split large dependencies
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('zustand') || id.includes('sockjs') || id.includes('stomp')) {
              return 'vendor-state';
            }
            if (id.includes('@dnd-kit')) {
              return 'vendor-dnd';
            }
            if (id.includes('lucide') || id.includes('icons')) {
              return 'vendor-icons';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
}));

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@modules': path.resolve(__dirname, './src/modules'),
    },
  },
  define: {
    global: 'window',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        // keep /api prefix because backend maps /api/auth
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/nhan-vien': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/phong-ban': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/chuc-vu': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/hop-dong': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/bang-luong': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/cham-cong': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/nghi-phep': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

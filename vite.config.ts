import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/admin/',
  appType: 'spa',
  server: {
    port: 5173,
    proxy: {
      '/admin/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/admin/oauth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/admin/auth-files/delete': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/admin/auth-files/import': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/public/providers': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})

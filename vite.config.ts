import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
      '/public/providers': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})

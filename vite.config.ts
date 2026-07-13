import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'admin-slash-redirect',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/admin') {
            req.url = '/admin/'
          }
          next()
        })
      },
    },
  ],
  base: '/',
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

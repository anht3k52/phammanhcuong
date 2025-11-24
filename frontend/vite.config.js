import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy /api -> http://localhost:3001 in dev so frontend can call backend without setting VITE_API_BASE
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})

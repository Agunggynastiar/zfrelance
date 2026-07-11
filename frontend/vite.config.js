import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {},
    Buffer: ['buffer', 'Buffer'],
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  server: {
    proxy: { '/api': 'http://localhost:3000' }
  }
})
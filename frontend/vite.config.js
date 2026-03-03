import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          hlsjs: ['hls.js'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/ws': {
        target: 'http://localhost:8000',
        ws: true,
      },
      '/upload-stream': 'http://localhost:8000',
      '/upload': 'http://localhost:8000',
      '/videos': 'http://localhost:8000',
      '/summarize': 'http://localhost:8000',
    },
  },
})

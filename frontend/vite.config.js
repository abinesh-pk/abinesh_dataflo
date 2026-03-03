import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ws': {
        target: 'http://localhost:8000',
        ws: true,
      },
      '/browse': 'http://localhost:8000',
      '/local-video': 'http://localhost:8000',
      '/upload': 'http://localhost:8000',
      '/videos': 'http://localhost:8000',
    },
  },
})

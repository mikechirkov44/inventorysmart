import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'pdf-tools',
              test: /node_modules[\\/](jspdf|html2canvas|dompurify)/,
              priority: 20,
              maxSize: 300 * 1024,
            },
            {
              name: 'qr-scanner',
              test: /node_modules[\\/]html5-qrcode/,
              priority: 20,
              maxSize: 300 * 1024,
            },
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom)/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // CRITICAL: relative asset paths for Capacitor WebView
  base: './',

  plugins: [react()],

  server: {
    port: 5173,
    host: '0.0.0.0', // allow LAN access for device testing
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-pdf':   ['jspdf'],
        },
      },
    },
    sourcemap: false,
    minify: 'esbuild',
  },
})

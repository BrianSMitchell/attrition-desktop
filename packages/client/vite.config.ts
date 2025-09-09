import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Desktop-only build configuration for Electron embedding
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'chrome100', // Electron uses Chromium
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          vendor: ['axios', 'zustand']
        }
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || mode || 'development'),
    'import.meta.env.DESKTOP_MODE': 'true',
    'import.meta.env.VITE_FORCE_DEV_MODE': JSON.stringify(mode === 'development' ? 'true' : 'false'),
    'import.meta.env.MODE': JSON.stringify(mode),
    'import.meta.env.PROD': JSON.stringify(mode === 'production')
  }
}))

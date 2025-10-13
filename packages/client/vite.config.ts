import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { fileURLToPath, URL } from 'node:url'
import { ENV_VARS } from '../../../shared/src/constants/env-vars';
import { ENV_VALUES } from '@shared/constants/configuration-keys';
import { DIRECTORY_PATHS } from '../../../shared/src/constants/file-paths';



// Desktop-only build configuration for Electron embedding
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === ENV_VALUES.DEVELOPMENT;
  
  return {
  plugins: [
    react(),
    // Only use vendor chunk splitting in production for faster dev builds
    ...(isDevelopment ? [] : [splitVendorChunkPlugin()])
  ],
  publicDir: '../../assets',
  base: './',
  build: {
    outDir: DIRECTORY_PATHS.DIST,
    sourcemap: isDevelopment ? true : 'hidden', // Faster dev builds with sourcemaps
    target: 'chrome100', // Electron uses Chromium
    minify: isDevelopment ? false : 'terser', // Skip minification in dev
    rollupOptions: isDevelopment ? {} : {
      // Only apply heavy optimizations in production builds
      plugins: [
        visualizer({
          filename: 'dist/stats.html',
          template: 'treemap',
          gzipSize: true,
          brotliSize: true,
          open: false
        })
      ],
      output: {
        manualChunks(id) {
          if (id.includes(DIRECTORY_PATHS.NODE_MODULES)) {
            // Hand-tuned groups for heavy libs first
            // Router before react to avoid catching 'react-router' in react bucket
            if (id.includes('react-router-dom') || id.includes('react-router')) return 'vendor-router'
            if (id.includes('@remix-run/router')) return 'vendor-remix-router'
            if (id.includes('history')) return 'vendor-history'
            // React core
            if (id.includes('react-dom') || (id.includes('react') && !id.includes('react-router'))) return 'vendor-react'
            // Pixi 6 packages bundled via pixi.js + viewport
            if (id.includes('pixi.js') || id.includes('pixi-viewport')) return 'vendor-pixi'
            // Pixi 7 scoped packages (from @pixi/*)
            if (id.includes('/@pixi/')) return 'vendor-pixi7'
            // Socket.io and engine.io stack
            if (id.includes('socket.io-client') || id.includes('engine.io') || id.includes('socket.io-parser')) return 'vendor-socket'
            // State mgmt
            if (id.includes('zustand') || id.includes('immer')) return 'vendor-state'
            // HTTP
            if (id.includes('axios')) return 'vendor-axios'
            // Schema/validation
            if (id.includes('/zod/')) return 'vendor-zod'
            // Events
            if (id.includes('eventemitter3')) return 'vendor-events'
            // Legacy small libs group (silence by grouping)
            if (id.includes('/qs/') || id.includes('/punycode/') || id.includes('/url/') || id.includes('/object-assign/')) return 'vendor-legacy'

            // Generic split from innermost node_modules segment
            const afterNm = id.split(DIRECTORY_PATHS.NODE_MODULES)[1]
            if (afterNm) {
              let cleaned = afterNm.replace(/^[\\\/]*/, '')
              const segments = cleaned.split(/node_modules[\\\/]/).filter(Boolean)
              if (segments.length) {
                const last = segments[segments.length - 1].replace(/^[\\\/]*/, '')
                const parts = last.split(/[\\\/]/)
                let pkg = parts[0] || 'vendor-other'
                if (pkg.startsWith('@') && parts.length > 1) {
                  pkg = `${pkg}/${parts[1]}`
                }
                return `vendor-${pkg.replace(/^@/, 'at-').replace(/[\\\\/]/g, '-')}`
              }
            }
            return 'vendor'
          }
          // Split shared workspace package into its own chunk if large
          if (id.includes('/packages/shared/')) return 'shared'
        }
      }
    }
    // keep default chunkSizeWarningLimit (500k) so we can track improvements
  },
  define: {
    'process.env[ENV_VARS.NODE_ENV]': JSON.stringify(process.env[ENV_VARS.NODE_ENV] || mode || 'development'),
    'import.meta.env.DESKTOP_MODE': 'true',
    'import.meta.env.VITE_FORCE_DEV_MODE': JSON.stringify(mode === ENV_VALUES.DEVELOPMENT ? 'true' : 'false'),
    'import.meta.env.MODE': JSON.stringify(mode),
    'import.meta.env.PROD': JSON.stringify(mode === ENV_VALUES.PRODUCTION)
  }
}; // Close the return statement
}); // Close the defineConfig

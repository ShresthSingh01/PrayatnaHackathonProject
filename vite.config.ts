import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false // Disable PWA in dev to prevent caching old versions
      },
      manifest: false // Using manual public/manifest.json
    })
  ],
  server: {
    host: true,
    port: 5174,
  }
})

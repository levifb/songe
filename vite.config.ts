import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },

  build: {
    rollupOptions: {
      output: {
        /**
         * O Firebase sozinho é metade do bundle. Separado em pedaço próprio,
         * ele fica no cache do navegador entre deploys — mexer no app não
         * obriga a rebaixar 170 KB de SDK de novo.
         */
        manualChunks(id: string) {
          if (id.includes('@firebase') || id.includes('node_modules/firebase')) return 'firebase'
          if (id.includes('framer-motion') || id.includes('node_modules/motion')) return 'motion'
          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },

  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Service worker próprio: além do cache, ele recebe as notificações.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
        // As fotos ficam de fora do precache: são 1,9 MB que o app busca sob
        // demanda e guarda no cache de tempo de execução.
        globIgnores: ['**/photos/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        name: 'Songe',
        short_name: 'Songe',
        description: 'O lugar onde a gente acompanha o que está construindo.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F4F6F9',
        theme_color: '#F4F6F9',
        categories: ['finance', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
})

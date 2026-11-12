import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          maximumFileSizeToCacheInBytes: 6000000,
        },
        manifest: {
          name: 'My Christmas World',
          short_name: 'Christmas World',
          description: 'Create, decorate, save, and explore your own persistent 3D Christmas wonderland diorama with daily gifts and Wonderworld landscape.',
          theme_color: '#0d1723',
          background_color: '#0d1723',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          icons: [
            {
              src: 'https://api.dicebear.com/7.x/bottts/svg?seed=xmas_pwa_icon&backgroundColor=0d1723',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
            {
              src: 'https://api.dicebear.com/7.x/bottts/svg?seed=xmas_pwa_icon&backgroundColor=0d1723',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.', '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

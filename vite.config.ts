import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Smart Dic',
          short_name: 'Smart Dic',
          description: 'Spaced repetition vocabulary learning app and bilingual dictionary',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjMWUxYjRiIi8+PHBhdGggZD0iTTMwIDI1aDIwdjUwaC0yMHptMjAgMGgyMHY1MGgtMjB6IiBmaWxsPSJub25lIiBzdHJva2U9IiNkNGEzNzMiIHN0cm9rZS13aWR0aD0iNCIvPjxjaXJjbGUgY3g9IjY1IiBjeT0iNDUiIHI9IjEwIiBmaWxsPSJub25lIiBzdHJva2U9IiNkNGEzNzMiIHN0cm9rZS13aWR0aD0iNCIvPjxsaW5lIHgxPSI3MiIgeTE9IjUyIiB4Mj0iODAiIHkyPSI2MCIgc3Ryb2tlPSIjZDRhMzczIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

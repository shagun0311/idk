
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      '/api/horizons': {
        target: 'https://ssd.jpl.nasa.gov',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/horizons/, '/api/horizons.api'),
      },

      '/api/chat': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

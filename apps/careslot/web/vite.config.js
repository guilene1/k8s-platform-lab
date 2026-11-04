import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run dev` proxies /api to a locally running API (PORT=8080).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8080' },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
});

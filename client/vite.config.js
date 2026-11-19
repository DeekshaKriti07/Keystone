import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {},
  },
  build: { assetsInlineLimit: 40000 },
  server: {
    host: '127.0.0.1',
    allowedHosts: ['terminal.local'],
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), fileURLToPath(new URL('..', import.meta.url))] },
    proxy: {
      '/api': 'http://127.0.0.1:5001',
      '/socket.io': { target: 'http://127.0.0.1:5001', ws: true },
    },
  },
});

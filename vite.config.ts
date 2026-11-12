import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Calculate base path for GitHub Pages compatibility:
// Supports GitHub Actions (BASE_PATH environment variable), or defaults to './' for docs/root hosting
const rawBase = process.env.BASE_PATH || process.env.VITE_BASE_PATH || '';
const base = rawBase
  ? (rawBase.endsWith('/') ? rawBase : `${rawBase}/`)
  : './';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base,
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});

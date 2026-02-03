import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * This repo uses a local file dependency for `@tasks-management/frontend-services`.
 * Vite treats linked packages as source and may skip CommonJS transform, causing
 * missing named exports during build. We explicitly include it in CJS handling.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  optimizeDeps: {
    include: ['@tasks-management/frontend-services'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/, /frontend-services[\\/]dist/],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/setup.ts'],
    },
  },
});

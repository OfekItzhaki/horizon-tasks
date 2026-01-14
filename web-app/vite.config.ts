import { defineConfig } from 'vite';
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
    force: true, // Force re-optimization on every start (remove after fix)
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/, /frontend-services[\\/]dist/],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'chart-vendor': ['recharts'],
          'query-vendor': ['@tanstack/react-query'],
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase limit slightly to reduce warnings
  },
});

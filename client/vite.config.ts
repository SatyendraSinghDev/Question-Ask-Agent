import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@app': path.resolve(__dirname, 'src/app'),
      '@lib': path.resolve(__dirname, 'src/lib'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
          charts: ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
}));

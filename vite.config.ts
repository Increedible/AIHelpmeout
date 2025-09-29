import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// IMPORTANT: we serve under /AIHelpmeout (sub-path safe)
export default defineConfig({
  base: '/AIHelpmeout/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The rules engine lives in engine/ at the repo root; the dev server must be able to reach it too.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { fs: { allow: ['..'] } },
});

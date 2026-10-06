import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Kural motoru reponun kökündeki engine/ klasöründe; dev sunucusu oraya da erişebilmeli.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { fs: { allow: ['..'] } },
});

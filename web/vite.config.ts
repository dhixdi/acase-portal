import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => ({
  // Gunakan './' agar path aset relatif dan aman untuk GitHub Pages dengan HashRouter,
  // atau ganti dengan '/nama-repo/' jika tidak menggunakan custom domain.
  base: './',
  plugins: [react()],
  server: {
    historyApiFallback: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true,
  }
}));

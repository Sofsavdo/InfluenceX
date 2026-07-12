import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Telegram Mini App — to'liq client-side SPA (SSR shart emas, PRD v2 §6)
//
// @influencex/shared is compiled as CommonJS (tsconfig module: "commonjs").
// Vite/Rollup cannot statically analyse CJS named exports unless the package
// is pre-bundled by esbuild (optimizeDeps) which converts CJS → ESM shims.
// commonjsOptions.include ensures the same transformation applies at
// production build time via @rollup/plugin-commonjs.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Telegram WebView'da test qilish uchun HTTPS tunnel (masalan ngrok) orqasidan ochiladi
  },
  optimizeDeps: {
    include: ['@influencex/shared'],
  },
  build: {
    commonjsOptions: {
      include: [/@influencex\/shared/, /node_modules/],
    },
  },
});

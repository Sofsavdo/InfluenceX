import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Telegram Mini App — to'liq client-side SPA (SSR shart emas, PRD v2 §6)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Telegram WebView'da test qilish uchun HTTPS tunnel (masalan ngrok) orqasidan ochiladi
  },
});

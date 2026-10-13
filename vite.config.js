import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // 0.0.0.0 をリッスンし、同一Wi-Fi内のiPhone/iPadからアクセス可能にする
    port: 5173
  }
});

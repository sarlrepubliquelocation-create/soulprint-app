import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    hmr: { host: 'localhost' },
    watch: { usePolling: true, interval: 800 },
  },
  legacy: { skipWebSocketTokenCheck: true },
})

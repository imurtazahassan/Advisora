import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '^/(auth|market-data|advisories|plans|scheduler|tranches|trades|watchlist|journal|notifications)(/|$)': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})

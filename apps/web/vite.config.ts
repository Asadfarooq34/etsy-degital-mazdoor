import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev proxy: the API's session cookie is SameSite=Strict, so the web UI
    // must talk to the API same-origin. In dev, /api/* and /health are
    // proxied to the API; the frontend uses relative URLs (see api.ts).
    // In production, serve the built dist from the same origin as the API
    // (or behind a reverse proxy that unifies them).
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/health': 'http://127.0.0.1:3001',
    },
  },
})

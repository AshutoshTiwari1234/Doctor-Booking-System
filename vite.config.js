import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Allow Firebase Google popup sign-in to work on localhost.
      // COOP (Cross-Origin-Opener-Policy) blocks window.opener which
      // Firebase needs to receive the OAuth result from the popup.
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    },
  },
})


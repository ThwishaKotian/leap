import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the app from /leap/ (set by .github/workflows/deploy.yml). Everywhere else, incl. Vercel, uses /.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
})

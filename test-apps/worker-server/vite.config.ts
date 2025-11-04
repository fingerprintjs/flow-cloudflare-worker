import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import checker from 'vite-plugin-checker'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    checker({
      typescript: true,
    }),
    cloudflare(),
  ],
  preview: {
    allowedHosts: true,
  },
})

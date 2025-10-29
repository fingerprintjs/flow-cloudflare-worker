import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import checker from 'vite-plugin-checker'

export default defineConfig({
  plugins: [
    checker({
      typescript: {
        tsconfigPath: './tsconfig.worker.json',
      },
    }),
    cloudflare(),
  ],
  build: {
    outDir: 'dist/worker',
  },
})

import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import checker from 'vite-plugin-checker'
import { getLicenseBanner } from './build-utils/license'

export default defineConfig({
  server: {
    cors: false,
  },
  plugins: [
    checker({
      typescript: {
        tsconfigPath: './tsconfig.worker.json',
      },
    }),
    cloudflare(),
  ],
  esbuild: {
    banner: getLicenseBanner('Flow Worker'),
  },
})

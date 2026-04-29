import { defineConfig, Plugin } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import checker from 'vite-plugin-checker'
import { getLicenseBanner } from './build-utils/license'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

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
    {
      // Copy the worker to file with a name that will match the expected asset name in the GitHub release
      name: 'copy-worker-asset',
      closeBundle() {
        const src = resolve(__dirname, 'dist/flow_cloudflare_worker/index.js')
        const dest = resolve(__dirname, 'dist/flow_cloudflare_worker.js')
        copyFileSync(src, dest)
        this.info(
          'Copying "dist/flow_cloudflare_worker/index.js" to path expected by release workflow "dist/flow_cloudflare_worker.js"'
        )
      },
    } satisfies Plugin,
  ],
  esbuild: {
    banner: getLicenseBanner('Flow Worker'),
  },
})

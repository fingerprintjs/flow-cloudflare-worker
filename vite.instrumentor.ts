import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import { getLicenseBanner } from './build-utils/license'

export default defineConfig({
  plugins: [
    checker({
      typescript: {
        tsconfigPath: './tsconfig.instrumentor.json',
      },
    }),
  ],
  build: {
    outDir: 'dist/instrumentor',
    lib: {
      entry: 'src/scripts/instrumentor/index.ts',
      formats: ['iife'],
      name: 'instrumentor',
      fileName: 'instrumentor',
    },
  },
  esbuild: {
    banner: getLicenseBanner('Flow Instrumentor'),
  },
})

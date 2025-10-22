import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'

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
      entry: 'src/instrumentor/index.ts',
      formats: ['iife'],
      name: 'instrumentor',
      fileName: 'instrumentor',
    },
  },
})

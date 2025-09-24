import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'

export default defineConfig({
  plugins: [
    checker({
      typescript: {
        tsconfigPath: './tsconfig.instrumentation.json',
      },
    }),
  ],
  build: {
    outDir: 'public',
    lib: {
      entry: 'src/instrumentation/index.ts',
      formats: ['iife'],
      name: 'instrumentation',
      fileName: 'instrumentation',
    },
  },
})

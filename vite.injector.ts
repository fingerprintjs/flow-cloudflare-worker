import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'

export default defineConfig({
  plugins: [
    checker({
      typescript: {
        tsconfigPath: './tsconfig.injector.json',
      },
    }),
  ],
  build: {
    outDir: 'public',
    lib: {
      entry: 'src/injector/index.ts',
      formats: ['iife'],
      name: 'injector',
      fileName: 'injector',
    },
  },
})

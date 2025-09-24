import { defineConfig } from 'vite'

export default defineConfig({
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

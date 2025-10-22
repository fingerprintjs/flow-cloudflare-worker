import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'

export default defineConfig({
  plugins: [
    checker({
      typescript: {
        tsconfigPath: './tsconfig.agent-processor.json',
      },
    }),
  ],
  build: {
    outDir: 'dist/agent-processor',
    lib: {
      entry: 'src/agent-processor/index.ts',
      formats: ['iife'],
      name: 'agentProcessor',
      fileName: 'agent-processor',
    },
  },
})

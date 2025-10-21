import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: [['text', { file: 'coverage.txt' }], ['lcov'], ['json']],
    },
    projects: [
      {
        test: {
          environment: 'happy-dom',
          name: {
            label: 'Instrumentor',
            color: 'green',
          },
          include: ['__tests__/instrumentor/**/*.test.ts'],
        },
      },
      // Tests in worker-runtime will use a separate worker project for a more accurate runtime
      defineWorkersProject({
        test: {
          name: {
            label: 'Worker runtime',
            color: 'blue',
          },
          include: ['__tests__/worker-runtime/**/*.test.ts'],
          inspector: {
            port: 3456,
          },
          deps: {
            optimizer: {
              ssr: {
                enabled: true,
                include: ['node:inspector'],
              },
            },
          },
          poolOptions: {
            workers: {
              wrangler: {
                configPath: './wrangler.jsonc',
              },
            },
          },
        },
      }),
      // Other unit tests for worker can run using node, for easier debugging
      {
        test: {
          environment: 'node',
          name: {
            label: 'Worker',
            color: 'green',
          },
          include: ['__tests__/worker/**/*.test.ts'],
        },
      },
    ],
  },
})

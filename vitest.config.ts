import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: [['text', { file: 'coverage.txt' }], ['json'], ['lcov']],
      include: ['**/src/**/*'],
    },
    projects: [
      {
        test: {
          setupFiles: ['__tests__/utils/setupTests.ts'],
          environment: 'happy-dom',
          name: {
            label: 'Instrumentor',
            color: 'green',
          },
          include: ['__tests__/scripts/**/*.test.ts'],
        },
      },
      // Tests in worker-runtime will use a separate worker project for a more accurate runtime
      defineWorkersProject({
        test: {
          setupFiles: ['__tests__/utils/setupTests.ts'],
          name: {
            label: 'Worker runtime',
            color: 'blue',
          },
          include: ['__tests__/worker-runtime/**/*.test.ts'],
          inspector: {
            port: 3456,
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
          setupFiles: ['__tests__/utils/setupTests.ts'],
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

import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          environment: 'happy-dom',
          name: {
            label: 'Instrumentation',
            color: 'green',
          },
          include: ['__tests__/instrumentation/**/*.test.ts'],
        },
      },
      defineWorkersProject({
        test: {
          name: {
            label: 'Worker',
            color: 'blue',
          },
          include: ['__tests__/worker/**/*.test.ts'],
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
    ],
  },
})

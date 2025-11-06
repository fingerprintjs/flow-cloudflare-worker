import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'
import { getTestDomain, getTestProjectBaseUrl } from './utils/env'
import * as os from 'node:os'
import { getTestProjects } from './utils/projects'

config({
  path: ['.env', '.env.local'],
})

const browsers = ['Desktop Chrome'] as const

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : os.cpus().length,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
    baseURL: getTestDomain(),
  },
  projects: [
    {
      name: 'wait for website',
      testMatch: /global\.setup\.ts/,
    },
    ...browsers.flatMap((browser) => {
      return getTestProjects().flatMap((project) => {
        return {
          name: `${browser} - ${project.project}`,
          testMatch: project.testMatch,
          use: {
            ...devices[browser],
            project,
            metadata: project,
            baseURL: `https://${getTestProjectBaseUrl(project.project)}`,
          },
          dependencies: ['wait for website'],
        }
      })
    }),
  ],
})

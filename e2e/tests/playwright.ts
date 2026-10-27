import { test as baseTest } from '@playwright/test'
import { TestWorkerProjectData } from '../projects/types'

export const test = baseTest.extend<{
  project: TestWorkerProjectData
}>({
  // Option fixture: the value is provided per project via `use.project` in playwright.config.ts
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  project: [undefined as unknown as TestWorkerProjectData, { option: true }],
})

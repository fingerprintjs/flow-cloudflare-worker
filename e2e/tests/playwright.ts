import { test as baseTest } from '@playwright/test'
import { TestWorkerProjectData } from '../utils/types'

export const test = baseTest.extend<{
  project: TestWorkerProjectData
}>({
  project: async ({}, use, testInfo) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const project = (testInfo.project.use as any).project as TestWorkerProjectData

    await use(project)
  },
})

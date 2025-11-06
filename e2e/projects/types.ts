import { PlaywrightTestProject } from '@playwright/test'
import { TypedEnv } from '../../src/worker/types'
import { TestAppFn } from '../deploy/types'

export type TestWorkerProjectName =
  // Represents worker which fallback rule allows request
  | 'default-rule-allow'
  // Represents worker which fallback rule blocks request
  | 'default-rule-block'

/**
 * Represents the options that can be used to configure a FlowWorker test.
 */
export type FlowWorkerTestOptions = {
  variables?: Partial<TypedEnv>
}

export type TestWorkerProjectData = {
  projectName: TestWorkerProjectName
  host: string
  displayName: string
  testMatch: PlaywrightTestProject['testMatch'] | undefined
  flowWorker?: FlowWorkerTestOptions | undefined
  testAppFn: TestAppFn
}

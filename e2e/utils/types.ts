import { PlaywrightTestProject } from '@playwright/test'
import { TypedEnv } from '../../src/worker/types'

export type TestWorkerProject =
  // Represents worker which fallback rule allows request
  | 'default-rule-allow'
  // Represents worker which fallback rule blocks request
  | 'default-rule-block'

export type TestWorkerProjectData = {
  project: TestWorkerProject
  baseUrl: string
  name: string
  testMatch: PlaywrightTestProject['testMatch'] | undefined
  flowWorker?: {
    variables?: Partial<TypedEnv>
  }
}

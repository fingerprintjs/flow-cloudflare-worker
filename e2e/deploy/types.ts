import { TestProject } from '../projects/TestProject'

export type DeploymentContext = {
  project: Omit<TestProject, 'testAppFn'>
  getWorkerName: (suffix?: string) => string
}

export type TestAppFn = (context: DeploymentContext) => TestApp

export type TestApp = {
  /**
   * App name for display.
   * */
  appName: string
  /**
   * Method that deploys the app.
   * */
  deploy: () => Promise<void>
  /**
   * Method that deletes the app.
   * */
  delete: () => Promise<boolean>
}

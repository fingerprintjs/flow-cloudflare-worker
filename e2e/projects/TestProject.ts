import { FlowWorkerTestOptions, TestWorkerProjectData, TestWorkerProjectName } from './types'
import { getTestId, getTestProjectHost } from '../utils/env'
import { DeploymentContext, TestApp, TestAppFn } from '../deploy/types'
import { PlaywrightTestProject } from '@playwright/test'
import { deleteFlowWorker, deployFlowWorker } from '../deploy/flow/worker'

/**
 * Represents a test project with deployment and testing functionalities integrated.
 */
export class TestProject implements TestWorkerProjectData {
  projectName!: TestWorkerProjectName
  displayName!: string
  testMatch!: PlaywrightTestProject['testMatch']
  flowWorker?: FlowWorkerTestOptions
  testAppFn!: TestAppFn
  host!: string

  private readonly deploymentContext!: DeploymentContext
  private readonly testApp!: TestApp

  constructor(data: TestWorkerProjectData) {
    Object.assign(this, data)

    this.deploymentContext = {
      project: this,
      getWorkerName: (suffix) => {
        return `${getTestId()}-${this.projectName}` + (suffix ? `-${suffix}` : '')
      },
    }
    this.testApp = data.testAppFn(this.deploymentContext)
  }

  /**
   * Retrieves the base URL for the test project using the current project name.
   * The URL is generated dynamically based on the project configuration.
   *
   * @return {string} The base URL of the test project in the format `https://<host>`.
   */
  get baseUrl(): string {
    return `https://${getTestProjectHost(this.projectName)}`
  }

  /**
   * Deploys the application and flow worker based on the specified deployment context and environment conditions.
   *
   * The method first checks an environment variable `SKIP_WEBSITE`. If the variable is not set to 'true', it deploys the application.
   * Regardless of the environment condition, it proceeds to deploy the flow worker using the existing deployment context.
   *
   * @return {Promise<void>} A promise that resolves once the deployment has been completed.
   */
  async deploy(): Promise<void> {
    if (process.env.SKIP_WEBSITE != 'true') {
      console.info(`[${this.projectName}] Deploying app...`)
      await this.testApp.deploy()
      console.info(`[${this.projectName}] ✅ App deployed`)
    }

    console.info(`[${this.projectName}] Deploying flow worker...`)
    await deployFlowWorker(this.deploymentContext)
    console.info(`[${this.projectName}] ✅ Flow worker deployed.`)
    console.info(`[${this.projectName}] Available at: ${this.baseUrl}`)
  }

  /**
   * Deletes the associated resources and cleans up the environment.
   *
   * This method performs the deletion of the test application and any related flow worker resources associated with the deployment context.
   *
   * @return {Promise<void>} A promise that resolves when the deletion process is complete.
   */
  async delete(): Promise<void> {
    console.info(`[${this.projectName}] Deleting app...`)
    if (await this.testApp.delete()) {
      console.info(`[${this.projectName}] ✅ App deleted`)
    } else {
      console.info(`[${this.projectName}] App not found`)
    }

    console.info(`[${this.projectName}] Deleting flow worker...`)
    if (await deleteFlowWorker(this.deploymentContext)) {
      console.info(`[${this.projectName}] ✅ Flow worker deleted`)
    } else {
      console.info(`[${this.projectName}] Flow worker not found`)
    }
  }
}

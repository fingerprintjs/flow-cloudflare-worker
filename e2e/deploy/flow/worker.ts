import { TestWorkerProjectData } from '../../projects/types'
import {
  getCdnHost,
  getCloudflareZoneId,
  getIngressBaseHost,
  getPublicKey,
  getRegion,
  getRulesetId,
  getSecretKey,
  getTestProjectHost,
} from '../../utils/env'
import { TypedEnv } from '../../../src/worker/types'
import { getProtectedApis, WORKER_ROUTE_PREFIX } from '../../utils/config'
import path from 'node:path'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { wranglerDelete, wranglerDeploy } from '../utils/wrangler'
import { DeploymentContext } from '../types'

export const workerArtifactPath = path.resolve(__dirname, '../../../dist/flow_cloudflare_worker/index.js')

if (!existsSync(workerArtifactPath)) {
  throw new Error(`Worker artifact not found at ${workerArtifactPath}. Please build the worker first.`)
}

/**
 * Prepares the configuration object for a Wrangler worker, including its environment variables,
 * routes, and other settings specific to the provided project and worker details.
 */
function prepareWranglerConfig({
  projectName,
  flowWorker,
  workerName,
}: Pick<TestWorkerProjectData, 'projectName' | 'flowWorker'> & { workerName: string }) {
  const baseUrl = getTestProjectHost(projectName)

  const vars: TypedEnv = {
    FP_REGION: getRegion(),
    FP_CDN_URL: getCdnHost(),
    FP_INGRESS_BASE_HOST: getIngressBaseHost(),
    WORKER_ROUTE_PREFIX: WORKER_ROUTE_PREFIX,
    FP_PUBLIC_KEY: getPublicKey(),
    FP_SECRET_KEY: getSecretKey(),
    FP_RULESET_ID: getRulesetId(projectName),
    PROTECTED_APIS: getProtectedApis(projectName),
    IDENTIFICATION_PAGE_URLS: [`https://${baseUrl}`],
    FP_FAILURE_FALLBACK_ACTION: {
      type: 'block',
      status_code: 403,
    },
    ...flowWorker?.variables,
  }

  return {
    name: workerName,
    main: './index.js',
    compatibility_date: '2025-09-15',
    routes: [
      {
        pattern: `${baseUrl}/*`,
        zone_id: getCloudflareZoneId(),
      },
    ],
    vars,
    observability: {
      enabled: true,
      head_sampling_rate: 1,
    },
  }
}

/**
 * Deploys a Flow worker by preparing its configuration, creating a working directory,
 * and invoking a deployment process with the specified parameters.
 */
export async function deployFlowWorker({ getWorkerName, project }: DeploymentContext) {
  const workerName = getWorkerName('flow')
  const workDir = path.join(__dirname, '.tmp', workerName)

  if (existsSync(workDir)) {
    await fs.rm(workDir, { recursive: true })
  }

  const wranglerConfig = prepareWranglerConfig({
    projectName: project.projectName,
    flowWorker: project.flowWorker,
    workerName,
  })
  console.info('Deploying worker', JSON.stringify(wranglerConfig, null, 2))

  await fs.mkdir(workDir, { recursive: true })
  await fs.writeFile(path.join(workDir, 'wrangler.jsonc'), JSON.stringify(wranglerConfig, null, 2))
  await fs.copyFile(workerArtifactPath, path.join(workDir, 'index.js'))

  await wranglerDeploy(workDir, ['--config', 'wrangler.jsonc'])
}

/**
 * Deletes the flow worker and cleans up related temporary files.
 *
 * @param {Object} DeploymentContext - The context object which includes necessary utility methods for the deployment.
 * @param {Function} DeploymentContext.getWorkerName - A function to retrieve the worker name based on the specified type.
 * @return {Promise<boolean>} Returns a promise that resolves with `true` if the worker was deleted successfully,
 *                            or `false` if the specified worker directory does not exist.
 */
export async function deleteFlowWorker({ getWorkerName }: DeploymentContext): Promise<boolean> {
  const workerName = getWorkerName('flow')
  const workDirRoot = path.join(__dirname, '.tmp', workerName)

  if (existsSync(workDirRoot)) {
    const result = await wranglerDelete(workDirRoot, ['--config', 'wrangler.jsonc'])
    await fs.rm(workDirRoot, { recursive: true })

    return result
  }

  return false
}

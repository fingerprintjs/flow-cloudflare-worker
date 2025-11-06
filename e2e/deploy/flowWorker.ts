import { TestWorkerProjectData } from '../utils/types'
import {
  getCdnHost,
  getCloudflareZoneId,
  getIngressBaseHost,
  getPublicKey,
  getRegion,
  getRulesetId,
  getSecretKey,
  getTestId,
  getTestProjectBaseUrl,
  isDeleteOnly,
} from '../utils/env'
import { TypedEnv } from '../../src/worker/types'
import { getProtectedApis, WORKER_ROUTE_PREFIX } from '../utils/config'
import path from 'node:path'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { wranglerDelete, wranglerDeploy } from './wrangler'
import { getTestProjects } from '../utils/projects'

const workDirRoot = '.tmp'
export const workerArtifactPath = path.resolve(__dirname, '../../dist/worker/flow_cloudflare_worker/index.js')

if (!existsSync(workerArtifactPath)) {
  throw new Error(`Worker artifact not found at ${workerArtifactPath}. Please build the worker first.`)
}

function prepareWranglerConfig({ project, flowWorker }: TestWorkerProjectData) {
  const baseUrl = getTestProjectBaseUrl(project)
  const workerName = `${project}-${getTestId()}`

  const vars: TypedEnv = {
    FP_REGION: getRegion(),
    FP_CDN_URL: getCdnHost(),
    FP_INGRESS_BASE_HOST: getIngressBaseHost(),
    WORKER_ROUTE_PREFIX: WORKER_ROUTE_PREFIX,
    FP_PUBLIC_KEY: getPublicKey(),
    FP_SECRET_KEY: getSecretKey(),
    FP_RULESET_ID: getRulesetId(project),
    PROTECTED_APIS: getProtectedApis(project),
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

export async function deployFlowWorkers() {
  if (existsSync(workDirRoot)) {
    const workDirContents = await fs.readdir(workDirRoot)
    for (const file of workDirContents) {
      await wranglerDelete(path.join(workDirRoot, file), ['--config', 'wrangler.jsonc'])
    }
    await fs.rm(workDirRoot, { recursive: true })
  }

  if (isDeleteOnly()) {
    return
  }

  const projects = getTestProjects()

  for (const project of projects) {
    const wranglerConfig = prepareWranglerConfig(project)
    console.info('Deploying worker', JSON.stringify(wranglerConfig, null, 2))

    const workDir = path.join(workDirRoot, project.project)

    await fs.mkdir(workDir, { recursive: true })
    await fs.writeFile(path.join(workDir, 'wrangler.jsonc'), JSON.stringify(wranglerConfig, null, 2))
    await fs.copyFile(workerArtifactPath, path.join(workDir, 'index.js'))

    await wranglerDeploy(workDir, ['--config', 'wrangler.jsonc'])
  }
}

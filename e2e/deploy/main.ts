import { config } from 'dotenv'
import path from 'node:path'
import fs from 'node:fs/promises'
import { v4 } from 'uuid'
import { TypedEnv } from '../../src/worker/types'
import { getProtectedApis, WORKER_ROUTE_PREFIX } from '../utils/config'
import {
  getCdnHost,
  getCloudflareZoneId,
  getIngressBaseHost,
  getPublicKey,
  getRegion,
  getRulesetId,
  getSecretKey,
  getTestDomain,
  isDeleteOnly,
} from '../utils/env'
import { deleteWorker, deployWorker } from './wrangler'
import { existsSync } from 'node:fs'

config({
  path: ['.env', '.env.local'],
})

const deploymentId = v4()
const workDir = path.join('.tmp', `fingerprint-flow-cloudflare-e2e`)
const workerName = `flow-cloudflare-worker-${deploymentId}`

const workerArtifactPath = path.resolve(__dirname, '../../dist/worker/flow_cloudflare_worker/index.js')

if (!existsSync(workerArtifactPath)) {
  throw new Error(`Worker artifact not found at ${workerArtifactPath}. Please build the worker first.`)
}

function prepareWranglerConfig() {
  const testDomain = new URL(getTestDomain())

  const vars: TypedEnv = {
    FP_REGION: getRegion(),
    FP_CDN_URL: getCdnHost(),
    FP_INGRESS_BASE_HOST: getIngressBaseHost(),
    WORKER_ROUTE_PREFIX: WORKER_ROUTE_PREFIX,
    FP_PUBLIC_KEY: getPublicKey(),
    FP_SECRET_KEY: getSecretKey(),
    FP_RULESET_ID: getRulesetId(),
    PROTECTED_APIS: getProtectedApis(),
    IDENTIFICATION_PAGE_URLS: [getTestDomain()],
    FP_FAILURE_FALLBACK_ACTION: {
      type: 'block',
      status_code: 403,
    },
  }

  return {
    name: workerName,
    main: './index.js',
    compatibility_date: '2025-09-15',
    routes: [
      {
        pattern: `${testDomain.hostname}/*`,
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

async function deploy() {
  if (existsSync(workDir)) {
    await deleteWorker(workDir)
    await fs.rm(workDir, { recursive: true })
  }

  if (isDeleteOnly()) {
    return
  }

  const wranglerConfig = prepareWranglerConfig()

  console.info('Deploying worker', JSON.stringify(wranglerConfig, null, 2))

  await fs.mkdir(workDir, { recursive: true })
  await fs.writeFile(path.join(workDir, 'wrangler.jsonc'), JSON.stringify(wranglerConfig, null, 2))
  await fs.copyFile(workerArtifactPath, path.join(workDir, 'index.js'))

  await deployWorker(workDir)
}

deploy().catch((error) => {
  console.error(error)
  process.exit(1)
})

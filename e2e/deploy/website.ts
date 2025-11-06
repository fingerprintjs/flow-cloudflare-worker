import path from 'node:path'
import { TestWorkerProject } from '../utils/types'
import { getTestId, getTestProjectBaseUrl, isDeleteOnly } from '../utils/env'
import { mutateWranglerConfig, wranglerDelete, wranglerDeploy } from './wrangler'
import { getTestProjects } from '../utils/projects'
import { execSync } from 'node:child_process'

const websitePath = path.resolve(__dirname, '../../test-apps/react-spa')

function getWorkerName(project: TestWorkerProject) {
  return `${getTestId()}-${project}-website`
}

export async function deployWebsite() {
  const projects = getTestProjects()

  for (const project of projects) {
    try {
      await wranglerDelete(websitePath, ['--name', getWorkerName(project.project)])
    } catch {
      // Ignore delete errors, in most cases it throws only if the worker doesn't exist
    }

    if (isDeleteOnly()) {
      continue
    }

    await deployWrangler(project.project)
  }
}

async function deployWrangler(project: TestWorkerProject) {
  const baseUrl = getTestProjectBaseUrl(project)

  await mutateWranglerConfig(path.join(websitePath, 'wrangler.jsonc'), async (config, { save }) => {
    config.name = getWorkerName(project)
    config.routes = [
      {
        custom_domain: true,
        pattern: baseUrl,
      },
    ]

    await save()

    // After wrangler changes, the website needs to be rebuilt
    execSync('pnpm build', {
      cwd: websitePath,
      killSignal: 'SIGINT',
      stdio: 'inherit',
      env: {
        PATH: process.env.PATH,
      },
    })

    await wranglerDeploy(websitePath)
  })
}

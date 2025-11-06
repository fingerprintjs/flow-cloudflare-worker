import { ProtectedApi } from '../../src/shared/types'
import { getTestProjectBaseUrl } from './env'
import { TestWorkerProject } from './types'

export function getProtectedPath(path: string, project: TestWorkerProject) {
  return `https://${getTestProjectBaseUrl(project)}/api${path}`
}

export function getProtectedApis(project: TestWorkerProject) {
  return [
    {
      url: getProtectedPath('/*', project),
      method: 'POST',
    },
  ] satisfies ProtectedApi[]
}

export const WORKER_ROUTE_PREFIX = 'flow'

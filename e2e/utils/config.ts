import { ProtectedApi } from '../../src/shared/types'
import { getTestProjectHost } from './env'
import { TestWorkerProjectName } from '../projects/types'

export function getProtectedPath(path: string, project: TestWorkerProjectName) {
  return `https://${getTestProjectHost(project)}/api${path}`
}

export function getProtectedApis(project: TestWorkerProjectName) {
  return [
    {
      url: getProtectedPath('/*', project),
      method: 'POST',
    },
  ] satisfies ProtectedApi[]
}

export const WORKER_ROUTE_PREFIX = 'flow'

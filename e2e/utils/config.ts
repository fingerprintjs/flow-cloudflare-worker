import { ProtectedApi } from '../../src/shared/types'
import { getTestDomain } from './env'

export function getProtectedPath(path: string) {
  return `${getTestDomain()}/protected${path}`
}

export function getProtectedApis() {
  return [
    {
      url: getProtectedPath('/*'),
      method: 'POST',
    },
  ] satisfies ProtectedApi[]
}

export const WORKER_ROUTE_PREFIX = 'flow'

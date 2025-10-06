import { ProtectedApi } from '../../shared/types'
import { PatcherRequest } from './types'

// TODO: When available, use url matcher here.
export function isProtectedUrl(request: PatcherRequest, protectedApis: ProtectedApi[]) {
  return protectedApis.some((protectedApi) => {
    const methodMatch = protectedApi.method === request.method
    console.debug('Checking protected url method', {
      apiMethod: protectedApi.method,
      requestMethod: request.method,
      methodMatch,
    })

    if (!methodMatch) {
      return false
    }

    const urlMatch = request.url.includes(protectedApi.url)
    console.debug('Checking protected url', {
      apiUrl: protectedApi.url,
      requestUrl: request.url,
      urlMatch,
    })

    return urlMatch
  })
}

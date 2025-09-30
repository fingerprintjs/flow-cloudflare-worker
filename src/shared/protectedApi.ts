import { ProtectedApi } from './types'

export type IsProtectedUrlParams = {
  url: string
  method: string
  protectedApis: ProtectedApi[]
}

// TODO: When available, use url matcher here.
export function isProtectedUrl({ url, method, protectedApis }: IsProtectedUrlParams) {
  return protectedApis.some((protectedApi) => {
    const methodMatch = protectedApi.method === method
    console.debug('Checking protected url method', {
      apiMethod: protectedApi.method,
      requestMethod: method,
      methodMatch,
    })

    if (!methodMatch) {
      return false
    }

    const urlMatch = url.includes(protectedApi.url)
    console.debug('Checking protected url', {
      apiUrl: protectedApi.url,
      requestUrl: url,
      urlMatch,
    })

    return urlMatch
  })
}

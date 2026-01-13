import { logger } from '../../../shared/logger'
import { PatcherRequest } from '../types'
import { resolveRequestInitMethod, setHeaderForRequestInit, setIncludeCredentialsForRequestInit } from './requestInit'

/**
 * Resolves fetch parameters into a standardized PatcherRequest object.
 *
 * Supports three types of fetch calls:
 * - fetch(url, requestInit) - URL as string
 * - fetch(urlObject, requestInit) - URL as URL object
 * - fetch(request) - Request object
 *
 * @param params - The parameters passed to the fetch function by the app.
 * @returns A `PatcherRequest` and the parameters to pass to the actual fetch invocation, or undefined if patching is unsupported.
 */
export function resolvePatcherRequest(
  params: Parameters<typeof fetch>
): [PatcherRequest, Parameters<typeof fetch>] | undefined {
  // fetch("https://example.com", {...})
  if (typeof params[0] === 'string') {
    const url = params[0]
    const requestInit = params[1]

    // no-cors mode requests disallow custom headers: https://developer.mozilla.org/en-US/docs/Web/API/RequestInit#mode
    if (requestInit?.mode === 'no-cors') {
      return undefined
    }

    return resolveRequestInitPatcherRequest(url, requestInit)
  }

  // fetch(new URL("https://example.com", window.location.href), {...})
  if (params[0] instanceof URL) {
    const url = params[0]
    const requestInit = params[1]

    // no-cors mode requests disallow custom headers: https://developer.mozilla.org/en-US/docs/Web/API/RequestInit#mode
    if (requestInit?.mode === 'no-cors') {
      return undefined
    }

    return resolveRequestInitPatcherRequest(url, requestInit)
  }

  // fetch({url: "https://example.com", method: "POST"})
  if (params[0] instanceof Request) {
    const request = params[0]

    // no-cors mode requests disallow custom headers: https://developer.mozilla.org/en-US/docs/Web/API/RequestInit#mode
    if (request.mode === 'no-cors') {
      return undefined
    }

    const updatedParams: [Request, undefined] = [request, undefined]
    return [
      {
        url: request.url.toString(),
        method: request.method,

        setIncludeCredentials() {
          const appIncludedCredentials = updatedParams[0].credentials === 'include'
          params[0] = new Request(request, { credentials: 'include' })
          return appIncludedCredentials
        },

        setHeader(name, value) {
          updatedParams[0].headers.set(name, value)
        },
      },
      updatedParams,
    ]
  }

  logger.warn('Unsupported fetch request', params)

  return undefined
}

function resolveRequestInitPatcherRequest(
  url: string | URL,
  requestInit?: RequestInit
): [PatcherRequest, Parameters<typeof fetch>] {
  const updatedParams: [string | URL, RequestInit] = [url, requestInit ? { ...requestInit } : {}]
  return [
    {
      url: url.toString(),
      method: resolveRequestInitMethod(updatedParams[1]),

      setIncludeCredentials() {
        return setIncludeCredentialsForRequestInit(updatedParams[1])
      },

      setHeader(name, value) {
        setHeaderForRequestInit(name, value, updatedParams[1])
      },
    },
    updatedParams,
  ]
}

import { logger } from '../../../shared/logger'
import { PatcherRequest } from '../types'
import { FetchParamsWithRequestInit, resolveRequestInitMethod, setHeaderForRequestInit } from './requestInit'

/**
 * Resolves fetch parameters into a standardized PatcherRequest object.
 *
 * Supports three types of fetch calls:
 * - fetch(url, requestInit) - URL as string
 * - fetch(urlObject, requestInit) - URL as URL object
 * - fetch(request) - Request object
 *
 * @param params - The parameters passed to the fetch function. Can be modified via the `setHeader` method of the returned PatcherRequest object.
 * @returns A PatcherRequest object with URL, method, and setHeader function, or undefined if unsupported
 */
export function resolvePatcherRequest(params: Parameters<typeof fetch>): PatcherRequest | undefined {
  // fetch("https://example.com", {...})
  if (typeof params[0] === 'string') {
    const requestInit = params[1]

    // no-cors mode requests disallow custom headers: https://developer.mozilla.org/en-US/docs/Web/API/RequestInit#mode
    if (requestInit?.mode === 'no-cors') {
      return undefined
    }

    return {
      url: params[0],
      method: resolveRequestInitMethod(requestInit),

      setHeader: (name, value) => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        setHeaderForRequestInit(name, value, params as FetchParamsWithRequestInit)
      },
    }
  }

  // fetch(new URL("https://example.com", window.location.href), {...})
  if (params[0] instanceof URL) {
    const requestInit = params[1]

    // no-cors mode requests disallow custom headers: https://developer.mozilla.org/en-US/docs/Web/API/RequestInit#mode
    if (requestInit?.mode === 'no-cors') {
      return undefined
    }

    return {
      url: params[0].toString(),
      method: resolveRequestInitMethod(requestInit),

      setHeader: (name, value) => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        setHeaderForRequestInit(name, value, params as FetchParamsWithRequestInit)
      },
    }
  }

  // fetch({url: "https://example.com", method: "POST"})
  if (params[0] instanceof Request) {
    const request = params[0]

    // no-cors mode requests disallow custom headers: https://developer.mozilla.org/en-US/docs/Web/API/RequestInit#mode
    if (request.mode === 'no-cors') {
      return undefined
    }

    return {
      url: request.url.toString(),
      method: request.method,

      setHeader: (name, value) => {
        request.headers.set(name, value)
      },
    }
  }

  logger.warn('Unsupported fetch request', params)

  return undefined
}

import { PatcherContext } from './context'
import { PatcherRequest } from './types'
import { ProtectedApi } from '../../shared/types'
import { handleSignalsInjection } from './signalsInjection'

/**
 * Parameters required for patching the fetch API.
 */
export type PatchFetchParams = {
  /** Array of protected APIs that should have signals attached to their requests */
  protectedApis: ProtectedApi[]
  /** Context object providing access to signals and other patcher functionality */
  ctx: PatcherContext
}

/**
 * Patches the global fetch API to automatically add Fingerprint signals to requests made to protected APIs.
 *
 * This function intercepts all fetch requests and checks if they target protected URLs. For protected
 * requests, it adds a signals' header before forwarding the request.
 *
 * @param params - Configuration object containing protected APIs and patcher context
 * @param params.protectedApis - Array of protected API configurations to monitor
 * @param params.ctx - Patcher context providing access to signals and other functionality
 *
 * @example
 * ```typescript
 * patchFetch({
 *   protectedApis: [{ url: 'https://api.example.com', method: 'POST' }],
 *   ctx: patcherContext
 * });
 * ```
 */
export function patchFetch({ protectedApis, ctx }: PatchFetchParams) {
  if (typeof window.fetch !== 'function') {
    console.warn('window.fetch is not available.')

    return
  }

  if (!protectedApis.length) {
    console.warn('No protected APIs found, skipping patching fetch.')
    return
  }

  const originalFetch = window.fetch
  if (originalFetch.toString() !== 'function fetch() { [native code] }') {
    console.warn('window.fetch is not a native function, unexpected behavior may occur.')
  }

  window.fetch = async (...params) => {
    try {
      console.debug('Incoming fetch request', params)

      const request = resolvePatcherRequest(params)

      if (request) {
        console.debug('Resolved fetch request:', request)
        await handleSignalsInjection({ request, protectedApis, ctx })
      }
    } catch (error) {
      console.error('Patched fetch fetch:', error)
    }

    return originalFetch(...params)
  }

  console.debug('Fetch patched successfully.')
}

/**
 * Resolves the HTTP method from a RequestInit object, defaulting to 'GET' if not specified.
 *
 * @param requestInit - Optional RequestInit object that may contain a method property
 * @returns The HTTP method string, defaults to 'GET' if not provided
 */
function resolveMethod(requestInit?: RequestInit) {
  return requestInit?.method ?? 'GET'
}

type FetchParamsWithRequestInit = [any, RequestInit | undefined]

/**
 * Sets a header for a fetch request by modifying the RequestInit object in the fetch parameters.
 *
 * If a RequestInit object exists, it updates the headers. If no RequestInit exists, it creates
 * a new one with the specified header.
 *
 * @param name - The header name to set
 * @param value - The header value to set
 * @param fetchParams - Array containing fetch parameters where the second element is RequestInit
 */
function setHeaderForRequestInit(name: string, value: string, fetchParams: FetchParamsWithRequestInit) {
  const requestInit = fetchParams[1]

  if (requestInit) {
    const headers = new Headers(requestInit.headers)
    headers.set(name, value)
    requestInit.headers = headers
  } else {
    const headers = new Headers()
    headers.set(name, value)

    // If no requestInit was provided, create it as a second argument
    fetchParams.push({
      headers,
    })
  }
}

/**
 * Resolves fetch parameters into a standardized PatcherRequest object.
 *
 * Supports three types of fetch calls:
 * - fetch(url, requestInit) - URL as string
 * - fetch(urlObject, requestInit) - URL as URL object
 * - fetch(request) - Request object
 *
 * @param params - The parameters passed to the fetch function
 * @returns A PatcherRequest object with URL, method, and setHeader function, or undefined if unsupported
 */
function resolvePatcherRequest(params: Parameters<typeof fetch>): PatcherRequest | undefined {
  // fetch("https://example.com", {...})
  if (typeof params[0] === 'string') {
    const requestInit = params[1]

    return {
      url: params[0],
      method: resolveMethod(requestInit),

      setHeader: (name, value) => {
        setHeaderForRequestInit(name, value, params as FetchParamsWithRequestInit)
      },
    }
  }

  // fetch(new URL("https://example.com", window.location.href), {...})
  if (params[0] instanceof URL) {
    const requestInit = params[1]

    return {
      url: params[0].toString(),
      method: resolveMethod(requestInit),

      setHeader: (name, value) => {
        setHeaderForRequestInit(name, value, params as FetchParamsWithRequestInit)
      },
    }
  }

  // fetch({url: "https://example.com", method: "POST"})
  if (params[0] instanceof Request) {
    const request = params[0]

    return {
      url: request.url.toString(),
      method: request.method,

      setHeader: (name, value) => {
        request.headers.set(name, value)
      },
    }
  }

  console.warn('Unsupported fetch request', params)

  return undefined
}

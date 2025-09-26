import { PatcherContext } from './context'
import { PatcherRequest } from './types'
import { isProtectedUrl } from './url'
import { ProtectedApi } from '../../shared/types'
import { SIGNALS_HEADER } from '../../shared/const'

export type PatchFetchParams = {
  protectedApis: ProtectedApi[]
  ctx: PatcherContext
}

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

  window.fetch = async (...params) => {
    try {
      console.debug('Incoming fetch request', params)

      const requestData = resolvePatcherRequest(params)
      console.debug('Resolved fetch request:', requestData)

      if (requestData && isProtectedUrl(requestData, protectedApis)) {
        console.debug('Patching fetch request:', requestData.url)

        const signals = await ctx.getSignals()

        if (signals) {
          console.debug('Adding signals header for:', requestData.url)
          requestData.setHeader(SIGNALS_HEADER, signals)
        } else {
          console.warn('No signals data found.')
        }
      } else {
        console.debug('Skipping patching fetch request:', requestData?.url)
      }
    } catch (error) {
      console.error('Patched fetch fetch:', error)
    }

    return originalFetch(...params)
  }

  console.debug('Fetch patched successfully.')
}

function resolveMethod(requestInit?: RequestInit) {
  return requestInit?.method ?? 'GET'
}

type FetchParamsWithRequestInit = [any, RequestInit | undefined]

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

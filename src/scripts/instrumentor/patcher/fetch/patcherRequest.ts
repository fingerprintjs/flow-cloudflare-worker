import { logger } from '../../../shared/logger'
import { PatcherRequest } from '../types'

export type ResolvedPatcherRequest = {
  request: PatcherRequest
  effectiveRequest: Request
  updatedParams: [Request]
}

/**
 * Resolves fetch parameters into a standardized PatcherRequest object.
 *
 * Resolves every supported fetch call into one effective Request. The same
 * request is used for matching, business-context extraction, mutation, and forwarding.
 *
 * @param params - The parameters passed to the fetch function by the app.
 * @returns The effective request and its patching interface, or undefined when patching is unsupported.
 */
export function resolvePatcherRequest(params: Parameters<typeof fetch>): ResolvedPatcherRequest | undefined {
  const [input, init] = params
  if (typeof input !== 'string' && !(input instanceof URL) && !(input instanceof Request)) {
    logger.warn('Unsupported fetch request', params)
    return undefined
  }

  let effectiveRequest: Request
  try {
    effectiveRequest = createEffectiveRequest(input, init)
  } catch (error) {
    logger.warn('Failed to resolve fetch request', error)
    return undefined
  }

  // no-cors mode requests disallow custom headers: https://developer.mozilla.org/en-US/docs/Web/API/RequestInit#mode
  if (effectiveRequest.mode === 'no-cors') {
    return undefined
  }

  const updatedParams: [Request] = [effectiveRequest]
  const request: PatcherRequest = {
    url: effectiveRequest.url,
    method: effectiveRequest.method,

    setIncludeCredentials() {
      const appIncludedCredentials = updatedParams[0].credentials === 'include'
      if (!appIncludedCredentials) {
        updatedParams[0] = new Request(updatedParams[0], { credentials: 'include' })
      }
      return appIncludedCredentials
    },

    setHeader(name, value) {
      updatedParams[0].headers.set(name, value)
    },
  }

  return { request, effectiveRequest, updatedParams }
}

function createEffectiveRequest(input: string | URL | Request, init?: RequestInit): Request {
  if (!(input instanceof Request)) {
    return new Request(input, init)
  }

  const request = input.clone()
  const inheritedInit: RequestInit = {
    method: request.method,
    headers: request.headers,
    body: request.body,
    cache: request.cache,
    credentials: request.credentials,
    integrity: request.integrity,
    keepalive: request.keepalive,
    mode: request.mode,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    signal: request.signal,
  }

  if (init) {
    for (const key of Object.keys(init)) {
      const value = Reflect.get(init, key)
      if (value !== undefined) {
        Reflect.set(inheritedInit, key, value)
      }
    }
  }

  return new Request(request.url, inheritedInit)
}

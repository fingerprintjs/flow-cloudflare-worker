import { PatcherContext } from '../context'
import { ProtectedApi } from '../../../shared/types'
import { handleSignalsInjection } from '../signalsInjection'
import { resolvePatcherRequest } from './patcherRequest'

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
    console.debug('window.fetch is not a native function, unexpected behavior may occur.')
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
      console.error('Patched fetch error:', error)
    }

    return originalFetch(...params)
  }

  console.debug('Fetch patched successfully.')
}

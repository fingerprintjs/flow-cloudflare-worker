import { PatcherContext } from '../context'
import { ProtectedApi } from '../../../../shared/types'
import { handleSignalsInjection } from '../signalsInjection'
import { resolvePatcherRequest } from './patcherRequest'
import { AGENT_DATA_HEADER } from '../../../../shared/const'

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
 * @param ctx - Patcher context providing access to signals and other functionality
 *
 */
export function patchFetch(ctx: PatcherContext) {
  if (typeof window.fetch !== 'function') {
    console.warn('window.fetch is not available.')

    return
  }

  const originalFetch = window.fetch

  window.fetch = async (...params) => {
    let didInjectSignals = false

    try {
      console.debug('Incoming fetch request', params)

      const request = resolvePatcherRequest(params)

      if (request) {
        console.debug('Resolved fetch request:', request)
        didInjectSignals = await handleSignalsInjection({ request, ctx })
      }
    } catch (error) {
      console.error('Patched fetch error:', error)
    }

    const response = await originalFetch(...params)

    try {
      if (didInjectSignals) {
        const agentData = response.headers.get(AGENT_DATA_HEADER)

        if (agentData) {
          ctx.processAgentData(agentData)
        } else {
          console.warn('Agent data not found in response')
        }
      }
    } catch (e) {
      console.error('Error processing agent data:', e)
    }

    return response
  }

  console.debug('Fetch patched successfully.')
}

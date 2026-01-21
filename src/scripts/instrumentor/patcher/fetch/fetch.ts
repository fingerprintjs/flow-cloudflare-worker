import { PatcherContext } from '../context'
import { ProtectedApi } from '../../../../shared/types'
import { collectSignalsForProtectedUrl, injectSignalsIntoRequest } from '../signalsInjection'
import { resolvePatcherRequest } from './patcherRequest'
import { AGENT_DATA_HEADER } from '../../../../shared/const'
import { logger } from '../../../shared/logger'

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
    logger.warn('window.fetch is not available.')

    return
  }

  const originalFetch = window.fetch

  window.fetch = async (...params) => {
    let signals: string | undefined = undefined

    let actualParams: Parameters<typeof fetch> = params
    try {
      logger.debug('Incoming fetch request', params)

      const result = resolvePatcherRequest(params)

      if (result) {
        const [request, updatedParams] = result

        logger.debug('Resolved fetch request and updated params:', request, updatedParams)
        signals = await collectSignalsForProtectedUrl({ request, ctx })
        if (signals) {
          injectSignalsIntoRequest(request, signals)
          actualParams = updatedParams
        }
      }
    } catch (error) {
      logger.error('Patched fetch error:', error)
    }

    const response = await originalFetch(...actualParams)

    try {
      if (signals) {
        const agentData = response.headers.get(AGENT_DATA_HEADER)

        if (agentData) {
          ctx.processAgentData(agentData)
        } else {
          logger.warn('Agent data not found in response')
        }
      }
    } catch (e) {
      logger.error('Error processing agent data:', e)
    }

    return response
  }

  logger.debug('Fetch patched successfully.')
}

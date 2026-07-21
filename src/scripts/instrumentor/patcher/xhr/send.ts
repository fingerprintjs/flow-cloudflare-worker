import { PatcherContext } from '../context'
import { XHRWithFingerprintContext, FingerprintContextSymbol } from './types'
import { AGENT_DATA_HEADER } from '../../../../shared/const'
import { logger } from '../../../shared/logger'
import { collectSignalsForProtectedUrl, injectSignalsIntoRequest } from '../signalsInjection'
import {
  extractBusinessContextFromBody,
  extractBusinessContextFromHeaders,
  extractBusinessContextFromWindow,
  resolveBusinessContext,
} from '../businessContext'

/**
 * Creates a patched version of the `send` method for `XMLHttpRequest` instances.
 * Collects signals at send time so request headers and body are available for business context.
 *
 * @param {PatcherContext} ctx - The context object containing configurations and methods for signal processing.
 * @return {function} A patched `send` method for `XMLHttpRequest` instances.
 */
export function createPatchedSend(ctx: PatcherContext): typeof XMLHttpRequest.prototype.send {
  const originalSend = XMLHttpRequest.prototype.send

  return function patchedSend(this: XHRWithFingerprintContext, body?: Document | XMLHttpRequestBodyInit | null) {
    const sendRequest = () => originalSend.call(this, body)

    const fingerprintContext = this[FingerprintContextSymbol]

    if (!fingerprintContext) {
      return sendRequest()
    }

    // Avoid delaying unprotected requests
    let isProtected = false
    try {
      isProtected = ctx.isProtectedUrl(fingerprintContext.request.url, fingerprintContext.request.method)
    } catch (error) {
      logger.error('Error checking XHR URL:', error)
      return sendRequest()
    }

    if (!isProtected) {
      return sendRequest()
    }

    // Sync path is not used for protected APIs with async open; still guard
    let didInjectSignals = false
    prepareResponseHandling(this, ctx, () => didInjectSignals)

    void (async () => {
      try {
        const contentType = fingerprintContext.requestHeaders.get('content-type')
        const businessContext = resolveBusinessContext({
          body: await extractBusinessContextFromBody(body, contentType),
          headers: extractBusinessContextFromHeaders(fingerprintContext.requestHeaders),
          window: extractBusinessContextFromWindow(),
        })

        const signals = await collectSignalsForProtectedUrl({
          request: fingerprintContext.request,
          ctx,
          businessContext,
        })

        didInjectSignals = !!signals

        if (signals) {
          fingerprintContext.preservedWithCredentials = injectSignalsIntoRequest(
            fingerprintContext.request,
            signals
          ).appIncludedCredentials
        }
      } catch (error) {
        logger.error('Error injecting signals:', error)
      } finally {
        sendRequest()
      }
    })()
  }
}

/**
 * Prepares the handling of the response for the specified XMLHttpRequest by attaching
 * logic to manage agent data and context processing after the request is completed.
 *
 * @param {XMLHttpRequest} request - The XMLHttpRequest object for which response handling is prepared.
 * @param {PatcherContext} ctx - The context used for processing agent data after the request is completed.
 * @param {function(): boolean} didInjectSignals - A function that determines if signals were injected
 *        and influences whether agent data is processed.
 */
function prepareResponseHandling(request: XMLHttpRequest, ctx: PatcherContext, didInjectSignals: () => boolean) {
  // Helper to process agent data after response, only once
  const processAgentData = () => {
    try {
      request.removeEventListener?.('loadend', processAgentData)

      if (didInjectSignals()) {
        const agentData = request.getResponseHeader(AGENT_DATA_HEADER)

        if (agentData) {
          ctx.processAgentData(agentData)
        }
      }
    } catch (e) {
      logger.error('Error processing XHR agent data:', e)
    }
  }

  try {
    request.addEventListener('loadend', processAgentData)
  } catch {
    logger.error('Failed to add event listener for XHR agent data processing')
  }
}

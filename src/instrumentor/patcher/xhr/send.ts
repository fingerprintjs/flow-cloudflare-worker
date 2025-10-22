import { PatcherContext } from '../context'
import { XHRWithFingerprintContext, FingerprintContextSymbol } from './types'
import { AGENT_DATA_HEADER } from '../../../shared/const'

/**
 * Creates a patched version of the `send` method for `XMLHttpRequest` instances.
 * This allows for the injection and handling of signals in requests based on the provided context.
 *
 * @param {PatcherContext} ctx - The context object containing configurations and methods for signal processing.
 * @return {function} A patched `send` method for `XMLHttpRequest` instances.
 */
export function createPatchedSend(ctx: PatcherContext): typeof XMLHttpRequest.prototype.send {
  const originalSend = XMLHttpRequest.prototype.send

  return function patchedSend(this: XHRWithFingerprintContext, body?: Document | XMLHttpRequestBodyInit | null) {
    const sendRequest = () => originalSend.call(this, body)

    const fingerprintContext = this[FingerprintContextSymbol]
    const handleSignalsInjectionPromise = fingerprintContext?.handleSignalsInjectionPromise

    if (handleSignalsInjectionPromise) {
      let didInjectSignals = false

      prepareResponseHandling(this, ctx, () => didInjectSignals)

      // Signals' promise is present only in async requests. In that case, we can await the signal promise before sending the request
      handleSignalsInjectionPromise
        .then((didInject) => {
          didInjectSignals = didInject
        })
        .finally(() => {
          sendRequest()
        })

      return
    }

    // Sync requests are not supported for now
    return sendRequest()
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
      console.error('Error processing XHR agent data:', e)
    }
  }

  try {
    request.addEventListener?.('loadend', processAgentData)
  } catch {
    console.error('Failed to add event listener for XHR agent data processing')
  }
}

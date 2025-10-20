import { PatcherContext } from '../context'
import { FingerprintContextSymbol, XMLHttpRequestFingerprintMetadata, XMLHttpRequestRequestContext } from './types'
import { handleSignalsInjection } from '../signalsInjection'
import { createPatcherRequest } from './patcherRequest'

/**
 * Creates a patched version of the `XMLHttpRequest.prototype.open` method to capture request metadata,
 * apply signal handling, and provide additional context for fingerprinting.
 *
 * @param {PatcherContext} ctx - The context object used for configuring and managing the patching process
 *                              and interacting with signal handling mechanisms.
 * @return {function} Returns a new function that wraps the original `XMLHttpRequest.open` method and includes
 *                    additional behavior for metadata collection and signal injection.
 */
export function createPatchedOpen(ctx: PatcherContext): typeof XMLHttpRequest.prototype.open {
  const originalOpen = XMLHttpRequest.prototype.open

  return function patchedOpen(
    this: XMLHttpRequest & XMLHttpRequestFingerprintMetadata,
    method: string,
    url: string,
    async: boolean = true
  ) {
    let metadata: XMLHttpRequestFingerprintMetadata

    try {
      metadata = {
        method: method?.toUpperCase?.(),
        // Resolve relative URLs against the current location
        url: new URL(url, location.origin).toString(),
        async,
      }
    } catch (e) {
      // If URL cannot be resolved (very unlikely)
      console.warn('Failed to resolve XHR URL for patching:', e)

      metadata = {
        method: method?.toUpperCase?.(),
        url,
        async,
      }
    }

    try {
      const request = createPatcherRequest(this, metadata)
      // Start gathering signals as soon as possible.
      const signalsPromise = handleSignalsInjection({
        request,
        ctx,
      }).catch((error) => {
        console.error('Error injecting signals:', error)
        return false
      })

      const fingerprintContext: XMLHttpRequestRequestContext = {
        signalsPromise,
        ...metadata,
      }
      Object.assign(this, {
        [FingerprintContextSymbol]: fingerprintContext,
      })
    } catch (e) {
      console.error('Error setting XHR fingerprint context:', e)
    }

    return originalOpen.call(this, method, url, async)
  }
}

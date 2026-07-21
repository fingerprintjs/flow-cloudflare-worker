import { FingerprintContextSymbol, XHRFingerprintMetadata, XHRContext, XHRWithFingerprintContext } from './types'
import { createPatcherRequest } from './patcherRequest'
import { logger } from '../../../shared/logger'

/**
 * Creates a patched version of the `XMLHttpRequest.prototype.open` method to capture request metadata
 * and prepare context for signal injection at `send` time (when headers and body are available).
 */
export function createPatchedOpen(): typeof XMLHttpRequest.prototype.open {
  const originalOpen = XMLHttpRequest.prototype.open

  return function patchedOpen(
    this: XHRWithFingerprintContext,
    method: string,
    url: string,
    async: boolean = true,
    username?: string | null,
    password?: string | null
  ) {
    const callOpen = () => originalOpen.call(this, method, url, async, username, password)

    if (!async) {
      // Sync requests are not supported — clear any leftover async fingerprint context
      // so a reused XHR instance does not defer send into a microtask.
      delete this[FingerprintContextSymbol]
      return callOpen()
    }

    let metadata: XHRFingerprintMetadata

    try {
      metadata = {
        method: method?.toUpperCase?.(),
        // Resolve relative URLs against the current location
        url: new URL(url, location.origin).toString(),
      }
    } catch (e) {
      // If URL cannot be resolved (very unlikely)
      logger.warn('Failed to resolve XHR URL for patching:', e)

      metadata = {
        method: method?.toUpperCase?.(),
        url,
      }
    }

    try {
      const request = createPatcherRequest(this, metadata)

      const nextFingerprintContext: XHRContext = {
        preservedWithCredentials: this[FingerprintContextSymbol]?.preservedWithCredentials,
        requestHeaders: new Map(),
        request,
      }
      Object.assign(this, {
        [FingerprintContextSymbol]: nextFingerprintContext,
      })
    } catch (e) {
      logger.error('Error setting XHR fingerprint context:', e)
    }

    callOpen()

    // Restore the original withCredentials setting. This can only be changed before the initial send
    // or after the XHR instance is reinitialized by calling open after a send.
    const fingerprintContext = this[FingerprintContextSymbol]
    if (fingerprintContext?.preservedWithCredentials !== undefined) {
      this.withCredentials = fingerprintContext.preservedWithCredentials
      fingerprintContext.preservedWithCredentials = undefined
    }
  }
}

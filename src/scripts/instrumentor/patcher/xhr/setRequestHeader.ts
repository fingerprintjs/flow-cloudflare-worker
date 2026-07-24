import { FingerprintContextSymbol, XHRWithFingerprintContext } from './types'
import { HEADER_LINKED_ID_KEY, HEADER_TAG_KEY } from '../businessContext'

const TRACKED_HEADERS = new Set([HEADER_TAG_KEY, HEADER_LINKED_ID_KEY, 'content-type'])

/**
 * Patches `setRequestHeader` to record headers for business-context extraction.
 * XMLHttpRequest does not allow reading request headers back after they are set.
 */
export function createPatchedSetRequestHeader(): typeof XMLHttpRequest.prototype.setRequestHeader {
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader

  return function patchedSetRequestHeader(this: XHRWithFingerprintContext, name: string, value: string) {
    const result = originalSetRequestHeader.call(this, name, value)
    const fingerprintContext = this[FingerprintContextSymbol]
    if (fingerprintContext && TRACKED_HEADERS.has(name.toLowerCase())) {
      fingerprintContext.requestHeaders.append(name, String(value))
    }

    return result
  }
}

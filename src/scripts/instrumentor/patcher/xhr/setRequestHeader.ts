import { FingerprintContextSymbol, XHRWithFingerprintContext } from './types'

/**
 * Patches `setRequestHeader` to record headers for window→header injection.
 * XMLHttpRequest does not allow reading request headers back after they are set.
 */
export function createPatchedSetRequestHeader(): typeof XMLHttpRequest.prototype.setRequestHeader {
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader

  return function patchedSetRequestHeader(this: XHRWithFingerprintContext, name: string, value: string) {
    const fingerprintContext = this[FingerprintContextSymbol]
    if (fingerprintContext) {
      fingerprintContext.requestHeaders.set(name.toLowerCase(), String(value))
    }

    return originalSetRequestHeader.call(this, name, value)
  }
}

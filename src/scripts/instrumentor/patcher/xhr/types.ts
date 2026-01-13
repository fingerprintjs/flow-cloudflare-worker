import { PatcherRequest } from '../types'

export type XHRFingerprintMetadata = { method: string; url: string }

export type XHRContext = {
  request: PatcherRequest
  // Stores Promise returned by `collectSignalsForProtectedUrl` function
  signalsCollectionPromise?: Promise<string | undefined>
  /** Stores the original withCredentials value set by the app after the signals injection happens
   * before the send. This is cleared when the XHR instance is re-opened for further use */
  preservedWithCredentials: boolean | undefined
}

/**
 * A unique symbol used to represent the fingerprint metadata context.
 */
export const FingerprintContextSymbol = Symbol('FingerprintMetadata')

export type XHRWithFingerprintContext = XMLHttpRequest & { [FingerprintContextSymbol]?: XHRContext }

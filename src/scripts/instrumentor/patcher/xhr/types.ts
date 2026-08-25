import { PatcherRequest } from '../types'

export type XHRFingerprintMetadata = { method: string; url: string }

export type XHRContext = {
  request: PatcherRequest
  // Stores Promise returned by `collectSignalsForProtectedUrl` function
  signalsCollectionPromise?: Promise<string | undefined>
  /**
   * Request headers recorded via patched `setRequestHeader`.
   * XHR does not expose a way to read request headers back — needed so window
   * injection does not overwrite customer `fp-tag` / `fp-linked-id`.
   */
  requestHeaders: Map<string, string>
  /** Stores the original withCredentials value set by the app after the signals injection happens
   * before the send. This is cleared when the XHR instance is re-opened for further use */
  preservedWithCredentials: boolean | undefined
}

/**
 * A unique symbol used to represent the fingerprint metadata context.
 */
export const FingerprintContextSymbol = Symbol('FingerprintMetadata')

export type XHRWithFingerprintContext = XMLHttpRequest & { [FingerprintContextSymbol]?: XHRContext }

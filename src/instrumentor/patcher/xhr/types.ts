export type XHRFingerprintMetadata = { method: string; url: string; async: boolean }

export type XHRRequestContext = XHRFingerprintMetadata & {
  signalsPromise?: Promise<boolean>
}

/**
 * A unique symbol used to represent the fingerprint metadata context.
 */
export const FingerprintContextSymbol = Symbol('FingerprintMetadata')

export type XHRWithFingerprintContext = XMLHttpRequest & { [FingerprintContextSymbol]?: XHRRequestContext }

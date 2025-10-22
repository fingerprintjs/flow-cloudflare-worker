export type XHRFingerprintMetadata = { method: string; url: string }

export type XHRRequestContext = XHRFingerprintMetadata & {
  // Stores Promise returned by handleSignalsInjection function
  handleSignalsInjectionPromise?: Promise<boolean>
}

/**
 * A unique symbol used to represent the fingerprint metadata context.
 */
export const FingerprintContextSymbol = Symbol('FingerprintMetadata')

export type XHRWithFingerprintContext = XMLHttpRequest & { [FingerprintContextSymbol]?: XHRRequestContext }

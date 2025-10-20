export type XMLHttpRequestFingerprintMetadata = { method: string; url: string; async: boolean }

export type XMLHttpRequestRequestContext = XMLHttpRequestFingerprintMetadata & {
  signalsPromise?: Promise<boolean>
}

/**
 * A unique symbol used to represent the fingerprint metadata context.
 */
export const FingerprintContextSymbol = Symbol('FingerprintMetadata')

export type DecoratedXMLHttpRequest = XMLHttpRequest & { [FingerprintContextSymbol]?: XMLHttpRequestRequestContext }

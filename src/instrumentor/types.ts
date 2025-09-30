import type { load, LoadOptions } from '@fingerprintjs/fingerprintjs-pro'

/**
 * Represents a function that returns the current document ready state.
 *
 * @example
 * ```typescript
 * const documentReadyState = () => document.readyState;
 * ```
 * */
export type DocumentReadyStateFn = () => string

export type FingerprintJSLoader = {
  load: (options?: Omit<LoadOptions, 'apiKey'>) => ReturnType<typeof load>
}

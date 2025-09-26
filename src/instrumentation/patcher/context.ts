/**
 * Context interface for patchers that provides access to signals data.
 * Used in instrumentation to share signal information between different patching components.
 */
export type PatcherContext = {
  /**
   * Retrieves the current signals data.
   * @returns The signals string if set, undefined otherwise
   */
  getSignals: () => string | undefined
}

/**
 * Writable implementation of PatcherContext that allows both reading and writing signals data.
 * Provides a mutable context for patchers that need to store and retrieve signals information.
 * Signals can only be set once to prevent accidental overwrites.
 */
export class WritablePatcherContext implements PatcherContext {
  private signals?: string

  /**
   * Retrieves the current signals data.
   * @returns The signals string if set, undefined otherwise
   */
  getSignals(): string | undefined {
    return this.signals
  }

  /**
   * Sets the signals data. Can only be called once - subsequent calls will log a warning and return early.
   * @param signals - The signals string to store in the context
   */
  setSignals(signals: string) {
    if (this.signals) {
      console.warn('Invalid attempt to set signals that are already set.')
      return
    }

    this.signals = signals
  }
}

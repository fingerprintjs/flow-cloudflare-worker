/**
 * Function that processes agent data received from the worker for protected API requests.
 *
 * @example
 * ```typescript
 * const data = response.headers.get(AGENT_DATA_HEADER)
 * if (data) {
 *   ctx.processAgentData(data)
 * }
 * ```
 * */
type AgentDataProcessor = (data: string) => void

/**
 * Context interface for patchers that provides access to signals data.
 * Used in instrumentation to share signal information between different patching components.
 */
export type PatcherContext = {
  /**
   * Retrieves the current signals' data.
   * @returns Signals string if set, undefined otherwise
   */
  getSignals: () => Promise<string | undefined>

  /**
   * Processes agent data received from the worker for protected API requests.
   * @param data - Agent data
   * */
  processAgentData: AgentDataProcessor
}

/**
 * Writable implementation of PatcherContext that allows both reading and writing.
 * Provides a mutable context for patchers that need to handle specific fingerprinting tasks.
 *
 * @note: Providers can only be set once to prevent accidental overwrites.
 */
export class WritablePatcherContext implements PatcherContext {
  /**
   * Stores the signal data returned from the signal provider.
   * */
  private signals?: string | undefined

  /**
   * Function that resolves to the signal data.
   * */
  private signalsProvider?: () => Promise<string | undefined>

  /**
   * Function that processes agent data received from the worker for protected API requests.
   * */
  private agentDataProcessor?: AgentDataProcessor

  /**
   * Retrieves the current signals' data. If not set, it will attempt to fetch from the signals' provider.
   * @returns Signals string if set, undefined otherwise
   */
  async getSignals(): Promise<string | undefined> {
    if (!this.signals) {
      this.signals = await this.signalsProvider?.()
    }

    return this.signals
  }

  /**
   * Sets signals data provider. Can only be called once - subsequent calls will log a warning and return early.
   * @param signalsProvider - The signals provider to store in the context
   */
  setSignalsProvider(signalsProvider: () => Promise<string | undefined>) {
    if (this.signalsProvider) {
      console.warn('Invalid attempt to set signals provider that are already set.')
      return
    }

    this.signalsProvider = signalsProvider
  }

  /**
   * Sets agent data processor. Can only be called once - subsequent calls will log a warning and return early.
   * @param agentDataProcessor - The agent data processor to store in the context
   * */
  setAgentDataProcessor(agentDataProcessor: AgentDataProcessor) {
    if (this.agentDataProcessor) {
      console.warn('Invalid attempt to set agent data processor that are already set.')
      return
    }

    this.agentDataProcessor = agentDataProcessor
  }

  /**
   * Processes agent data received from the worker for protected API requests.
   * @param data - Agent data
   * */
  processAgentData(data: string): void {
    this.agentDataProcessor?.(data)
  }
}

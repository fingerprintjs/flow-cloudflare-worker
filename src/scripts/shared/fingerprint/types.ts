/**
 * Options for the JS agent `collect()` call (ODI).
 * @see https://docs.fingerprint.com/docs/on-demand-identification#calling-the-collect-method
 */
export type CollectOptions = {
  tag?: unknown
  linkedId?: string
}

export type Agent = {
  collect: (options?: CollectOptions) => Promise<string | undefined>
}

type StartOptions = {
  endpoints: string
  integrationInfo?: string[]
}

export type FingerprintLoader = {
  start: (options?: StartOptions) => Promise<Agent>
  handleAgentData: (data: string) => void
}

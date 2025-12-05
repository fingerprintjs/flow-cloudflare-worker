export type Agent = {
  collect: () => Promise<string | undefined>
  get: () => Promise<{ event_id: string }>
}

type StartOptions = {
  endpoints: string
  integrationInfo?: string[]
}

export type FingerprintLoader = {
  start: (options?: StartOptions) => Promise<Agent>
  handleAgentData: (data: string) => void
}

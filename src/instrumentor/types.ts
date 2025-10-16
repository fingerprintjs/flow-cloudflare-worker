export type Agent = {
  collect: () => Promise<string | undefined>
}

type StartOptions = {
  endpoints: string
}

export type FingerprintLoader = {
  start: (options?: StartOptions) => Promise<Agent>
  handleAgentData: (data: string) => void
}

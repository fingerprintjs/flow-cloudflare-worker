import type { HandleAgentDataOptions, load, LoadOptions } from '@fingerprintjs/fingerprintjs-pro'

export type Agent = Awaited<ReturnType<typeof load>>

export type FingerprintLoader = {
  load: (options?: Omit<LoadOptions, 'apiKey'>) => Promise<Agent>
  defaultEndpoint: string
  handleAgentData: (data: string, options?: HandleAgentDataOptions) => void
}

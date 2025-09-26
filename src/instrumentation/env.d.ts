import { load, LoadOptions } from '@fingerprintjs/fingerprintjs-pro'
import { ProtectedApi } from '../shared/types'

declare global {
  interface Window {
    __FP_FLOW_PROTECTED_APIS__?: ProtectedApi[]
    FingerprintJS?: {
      load: (options?: Omit<LoadOptions, 'apiKey'>) => ReturnType<typeof load>
    }
  }
}

export {}

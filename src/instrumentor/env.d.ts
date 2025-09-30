import { ProtectedApi } from '../shared/types'
import { FingerprintJSLoader } from './types'

declare global {
  interface Window {
    __FP_FLOW_PROTECTED_APIS__?: ProtectedApi[]
    FingerprintJS?: FingerprintJSLoader
  }
}

import { FingerprintJSLoader } from './types'

declare global {
  interface Window {
    FingerprintJS?: FingerprintJSLoader
  }
}

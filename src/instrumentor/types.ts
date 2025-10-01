import type { load, LoadOptions } from '@fingerprintjs/fingerprintjs-pro'

export type FingerprintJSLoader = {
  load: (options?: Omit<LoadOptions, 'apiKey'>) => ReturnType<typeof load>
}

import type { load, LoadOptions } from '@fingerprintjs/fingerprintjs-pro'

export type FingerprintLoader = {
  load: (options?: Omit<LoadOptions, 'apiKey'>) => ReturnType<typeof load>
}

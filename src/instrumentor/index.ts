import { setupInstrumentor } from './instrumentor'
import { importFingerprintLoader } from './fingerprint'

setupInstrumentor({
  documentReadyStateFn: () => document.readyState,
  fingerprintJs: importFingerprintLoader().then((loader) => {
    console.debug('Fetched FingerprintJS loader:', loader)

    return loader
  }),
}).catch((error) => {
  console.error('Error during instrumentation:', error)
})

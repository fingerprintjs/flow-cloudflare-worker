import { setupInstrumentor } from './instrumentor'
import { importFingerprintLoader } from './fingerprint/import'
import { getProtectedApis } from './protectedApis'

setupInstrumentor({
  protectedApis: getProtectedApis(),
  fingerprintLoader: importFingerprintLoader().then((loader) => {
    console.debug('Fetched FingerprintJS loader:', loader)

    return loader
  }),
}).catch((error) => {
  console.error('Error during instrumentation:', error)
})

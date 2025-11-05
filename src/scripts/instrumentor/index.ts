import { setupInstrumentor } from './instrumentor'
import { getEndpoint, importFingerprintLoader } from '../shared/fingerprint/import'
import { getProtectedApis } from './protectedApis'

setupInstrumentor({
  protectedApis: getProtectedApis(),
  endpoint: getEndpoint(),
  fingerprintLoader: importFingerprintLoader().then((loader) => {
    console.debug('Fetched FingerprintJS loader:', loader)

    return loader
  }),
}).catch((error) => {
  console.error('Error during instrumentation:', error)
})

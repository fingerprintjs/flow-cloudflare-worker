import { setupInstrumentor } from './instrumentor'
import { importFingerprintLoader, routePrefix } from './fingerprint/import'
import { getProtectedApis } from './protectedApis'

setupInstrumentor({
  protectedApis: getProtectedApis(),
  endpoint: routePrefix,
  fingerprintLoader: importFingerprintLoader().then((loader) => {
    console.debug('Fetched FingerprintJS loader:', loader)

    return loader
  }),
}).catch((error) => {
  console.error('Error during instrumentation:', error)
})

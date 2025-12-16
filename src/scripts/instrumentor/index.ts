import { setupInstrumentor } from './instrumentor'
import { getEndpoint, importFingerprintLoader } from '../shared/fingerprint/import'
import { getProtectedApis } from './protectedApis'
import { logger } from '../shared/logger'

setupInstrumentor({
  protectedApis: getProtectedApis(),
  endpoint: getEndpoint(),
  fingerprintLoader: importFingerprintLoader().then((loader) => {
    logger.debug('Fetched FingerprintJS loader:', loader)

    return loader
  }),
}).catch((error) => {
  logger.error('Error during instrumentation:', error)
})

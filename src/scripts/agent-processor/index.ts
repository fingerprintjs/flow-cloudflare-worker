import { importFingerprintLoader } from '../shared/fingerprint/import'
import { logger } from '../shared/logger'

const scriptTag = document.currentScript
const agentData = scriptTag?.dataset?.agentData

if (agentData) {
  importFingerprintLoader()
    .then((fp) => {
      fp.handleAgentData(agentData)
      logger.debug('Agent data processed:', agentData)
    })
    .catch((error) => {
      logger.error('Error processing agent data:', error)
    })
} else {
  logger.warn('No agent data found in the script tag.')
}

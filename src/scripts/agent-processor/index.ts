import { importFingerprintLoader } from '../shared/fingerprint/import'

const scriptTag = document.currentScript
const agentData = scriptTag?.dataset?.agentData

if (agentData) {
  importFingerprintLoader()
    .then((fp) => {
      fp.handleAgentData(agentData)
      console.debug('Agent data processed:', agentData)
    })
    .catch((error) => {
      console.error('Error processing agent data:', error)
    })
} else {
  console.warn('No agent data found in the script tag.')
}

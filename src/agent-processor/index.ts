import { importFingerprintLoader } from '../shared/fingerprint/import'

const agentData = '<AGENT_DATA>'
importFingerprintLoader(document.location.href).then((fp) => {
  fp.handleAgentData(agentData)
})

import { WritablePatcherContext } from '../patcher/context'
import { FingerprintLoader } from '../../shared/fingerprint/types'
import { getIntegrationInfo } from '../../../shared/integrationInfo'
import { createHiddenLink, storeToken } from '../agentDetection'

export type SetupPatcherContextParams = {
  // Writable patcher context to configure with signals' provider
  patcherCtx: WritablePatcherContext
  fingerprintLoader: Promise<FingerprintLoader>
  endpoint: string
}

/**
 * Sets up patcher context for fingerprinting.
 *
 * This function initialises the fingerprinting signals and agent data processing providers by waiting for the document
 * to be ready and then loading the FingerprintJS agent.
 */
export async function setupPatcherContext(params: SetupPatcherContextParams) {
  console.debug('Setting up signals collection...', document.readyState)

  const listener = async () => {
    createHiddenLink()
    await setProviders(params)
    document.removeEventListener('DOMContentLoaded', listener)
  }

  document.addEventListener('DOMContentLoaded', listener)
}

/**
 * Sets the necessary providers for fingerprinting in the patcher context.
 *
 * This function loads the FingerprintJS agent and configures the patcher context
 * with a necessary signals' provider and agent data processor.'
 *
 */
async function setProviders({ fingerprintLoader, endpoint, patcherCtx }: SetupPatcherContextParams) {
  const loader = await fingerprintLoader
  const agent = await loader.start({
    endpoints: endpoint,
    integrationInfo: [getIntegrationInfo('instrumentor')],
  })

  console.debug('FingerprintJS agent loaded', agent, {
    'typeof get': typeof agent.get,
  })

  patcherCtx.setSignalsProvider(async () => {
    console.debug('Collecting signals...')
    const signals = await agent.collect()
    console.debug('Signals collected:', signals)
    return signals
  })

  patcherCtx.setAgentDataProcessor((data) => {
    console.debug('Processing agent data:', data)
    loader.handleAgentData(data)
    console.debug('Agent data processed.')
  })

  console.debug('Patcher context prepared.')

  patcherCtx.getSignals().then((signals) => {
    if (signals) {
      storeToken(signals)
    }
  })
}

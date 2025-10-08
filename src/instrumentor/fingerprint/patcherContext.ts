import { WritablePatcherContext } from '../patcher/context'
import { FingerprintLoader } from '../types'

export type SetupPatcherContextParams = {
  // Writable patcher context to configure with signals' provider
  patcherCtx: WritablePatcherContext
  fingerprintLoader: Promise<FingerprintLoader>
}

/**
 * Sets up patcher context for fingerprinting.
 *
 * This function initialises the fingerprinting signals and agent data processing providers by waiting for the document
 * to be ready and then loading the FingerprintJS agent.
 */
export async function setupPatcherContext({ patcherCtx, fingerprintLoader }: SetupPatcherContextParams) {
  console.debug('Setting up signals collection...', document.readyState)

  const listener = async () => {
    await setProviders(patcherCtx, fingerprintLoader)
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
 * @param patcherCtx - Writable patcher context to configure with the signals' provider and agent data processor.
 * @param fingerprintLoader - Promise that resolves to the FingerprintJS Pro loader.
 */
async function setProviders(patcherCtx: WritablePatcherContext, fingerprintLoader: Promise<FingerprintLoader>) {
  const loader = await fingerprintLoader
  const agent = await loader.load()

  console.debug('FingerprintJS agent loaded', agent)

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
}

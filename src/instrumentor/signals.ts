import { WritablePatcherContext } from './patcher/context'
import { FingerprintJSLoader } from './types'

export type SetupPatcherContextParams = {
  // Writable patcher context to configure with signals' provider
  patcherCtx: WritablePatcherContext
  fingerprintJs: Promise<FingerprintJSLoader>
}

/**
 * Sets up patcher context for fingerprinting.
 *
 * This function initialises the fingerprinting signals and agent data processing providers by waiting for the document
 * to be ready and then loading the FingerprintJS agent. It handles both cases where the
 * document is already loaded and when it's still loading.
 */
export async function setupPatcherContext({ patcherCtx, fingerprintJs }: SetupPatcherContextParams) {
  console.debug('Setting up signals collection...', document.readyState)

  const listener = async () => {
    await setProviders(patcherCtx, fingerprintJs)
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
 * @param fingerprintJS - Promise that resolves to the FingerprintJS loader.
 */
async function setProviders(patcherCtx: WritablePatcherContext, fingerprintJS: Promise<FingerprintJSLoader>) {
  const loader = await fingerprintJS
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

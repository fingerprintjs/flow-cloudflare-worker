import { WritablePatcherContext } from './patcher/context'
import { FingerprintLoader } from './types'

export type SetupSignalsCollectionParams = {
  // Writable patcher context to configure with signals' provider
  patcherCtx: WritablePatcherContext
  fingerprintLoader: FingerprintLoader
}

/**
 * Sets up signals' collection for the patcher context.
 *
 * This function initialises the fingerprinting signals provider by waiting for the document
 * to be ready and then loading the FingerprintJS agent. It handles both cases where the
 * document is already loaded and when it's still loading.
 */
export async function setupSignalsCollection({ patcherCtx, fingerprintLoader }: SetupSignalsCollectionParams) {
  const listener = async () => {
    await setSignalsProvider(patcherCtx, fingerprintLoader)
    document.removeEventListener('DOMContentLoaded', listener)
  }

  document.addEventListener('DOMContentLoaded', listener)
}

/**
 * Sets the signals' provider in the patcher context using FingerprintJS.
 *
 * This function loads the FingerprintJS agent and configures the patcher context
 * with a signals' provider that collects fingerprinting data when called.
 *
 * @param patcherCtx - Writable patcher context to configure with the signals' provider
 * @param fingerprintLoader - FingerprintJS loader.
 */
async function setSignalsProvider(patcherCtx: WritablePatcherContext, fingerprintLoader: FingerprintLoader) {
  const agent = await fingerprintLoader.load()

  console.debug('FingerprintJS agent loaded', agent)

  patcherCtx.setSignalsProvider(async () => {
    console.debug('Collecting signals...')
    const signals = await agent.collect()
    console.debug('Signals collected:', signals)
    return signals
  })

  console.debug('Patcher context prepared.')
}

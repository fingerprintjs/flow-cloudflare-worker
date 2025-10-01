import { WritablePatcherContext } from './patcher/context'
import { DocumentReadyStateFn, FingerprintJSLoader } from './types'

export type SetupSignalsCollectionParams = {
  // Writable patcher context to configure with signals' provider
  patcherCtx: WritablePatcherContext

  // Current document ready state (document.readyState)
  documentReadyStateFn: DocumentReadyStateFn

  fingerprintJs: FingerprintJSLoader
}

/**
 * Sets up signals' collection for the patcher context.
 *
 * This function initialises the fingerprinting signals provider by waiting for the document
 * to be ready and then loading the FingerprintJS agent. It handles both cases where the
 * document is already loaded and when it's still loading.
 */
export async function setupSignalsCollection({
  patcherCtx,
  documentReadyStateFn,
  fingerprintJs,
}: SetupSignalsCollectionParams) {
  if (/complete|interactive|loaded/.test(documentReadyStateFn())) {
    // In case the document has finished parsing, document's readyState will
    // be one of "complete", "interactive" or (non-standard) "loaded".
    await setSignalsProvider(patcherCtx, fingerprintJs)
  } else {
    // The document is not ready yet, so wait for the DOMContentLoaded event
    const listener = async () => {
      await setSignalsProvider(patcherCtx, fingerprintJs)
      document.removeEventListener('DOMContentLoaded', listener)
    }

    document.addEventListener('DOMContentLoaded', listener)
  }
}

/**
 * Sets the signals' provider in the patcher context using FingerprintJS.
 *
 * This function loads the FingerprintJS agent and configures the patcher context
 * with a signals' provider that collects fingerprinting data when called.
 *
 * @param patcherCtx - Writable patcher context to configure with the signals' provider
 * @param fingerprintJS - FingerprintJS loader.
 */
async function setSignalsProvider(patcherCtx: WritablePatcherContext, fingerprintJS: FingerprintJSLoader) {
  const agent = await fingerprintJS.load()

  console.debug('FingerprintJS agent loaded', agent)

  patcherCtx.setSignalsProvider(async () => {
    console.debug('Collecting signals...')
    const signals = await agent.collect()
    console.debug('Signals collected:', signals)
    return signals
  })

  console.debug('Patcher context prepared.')
}

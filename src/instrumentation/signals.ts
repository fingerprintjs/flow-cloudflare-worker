import { WritablePatcherContext } from './patcher/context'

/**
 * Sets up signals' collection for the patcher context.
 *
 * This function initialises the fingerprinting signals provider by waiting for the document
 * to be ready and then loading the FingerprintJS agent. It handles both cases where the
 * document is already loaded and when it's still loading.
 *
 * @param patcherCtx - Writable patcher context to configure with signals' provider
 */
export async function setupSignalsCollection(patcherCtx: WritablePatcherContext) {
  if (/complete|interactive|loaded/.test(document.readyState)) {
    // In case the document has finished parsing, document's readyState will
    // be one of "complete", "interactive" or (non-standard) "loaded".
    await setSignalsProvider(patcherCtx)
  } else {
    // The document is not ready yet, so wait for the DOMContentLoaded event
    document.addEventListener('DOMContentLoaded', async () => {
      await setSignalsProvider(patcherCtx)
    })
  }
}

/**
 * Sets the signals' provider in the patcher context using FingerprintJS.
 *
 * This function loads the FingerprintJS agent and configures the patcher context
 * with a signals' provider that collects fingerprinting data when called.
 *
 * @param patcherCtx - Writable patcher context to configure with the signals' provider
 */
async function setSignalsProvider(patcherCtx: WritablePatcherContext) {
  const agent = await window.FingerprintJS!.load()

  patcherCtx.setSignalsProvider(() => agent.collect())

  console.debug('Patcher context prepared.')
}

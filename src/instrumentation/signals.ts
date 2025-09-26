import { WritablePatcherContext } from './patcher/context'

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

async function setSignalsProvider(patcherCtx: WritablePatcherContext) {
  const agent = await window.FingerprintJS!.load()

  patcherCtx.setSignalsProvider(() => agent.collect())

  console.debug('Patcher context prepared.')
}

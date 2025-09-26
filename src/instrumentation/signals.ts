import { WritablePatcherContext } from './patcher/context'

export function setupSignalsCollection(patcherCtx: WritablePatcherContext) {
  document.addEventListener('DOMContentLoaded', async () => {
    const agent = await window.FingerprintJS!.load()

    patcherCtx.setSignalsProvider(() => agent.collect())

    console.debug('Patcher context prepared.')
  })
}

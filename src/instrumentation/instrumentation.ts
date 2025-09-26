import { WritablePatcherContext } from './patcher/context'
import { getProtectedApis } from './protectedApis'
import { patchFetch } from './patcher/fetch'
import { setupSignalsCollection } from './signals'

export async function setupInstrumentation() {
  const FingerprintJS = window.FingerprintJS
  if (!FingerprintJS) {
    console.warn('FingerprintJS is not available, check your worker configuration.')
    return
  }

  const patcherCtx = new WritablePatcherContext()
  await setupSignalsCollection(patcherCtx)

  const protectedApis = getProtectedApis()
  patchFetch({ protectedApis, ctx: patcherCtx })
}

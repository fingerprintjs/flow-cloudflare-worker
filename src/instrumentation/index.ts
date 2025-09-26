import { getProtectedApis } from './protectedApis'
import { patchFetch } from './patcher/fetch'
import { WritablePatcherContext } from './patcher/context'
import { setupSignalsCollection } from './signals'

async function main() {
  const FingerprintJS = window.FingerprintJS
  if (!FingerprintJS) {
    console.warn('FingerprintJS is not available, check your worker configuration.')
    return
  }

  const patcherCtx = new WritablePatcherContext()
  const protectedApis = getProtectedApis()
  patchFetch({ protectedApis, ctx: patcherCtx })

  setupSignalsCollection(patcherCtx)
}

main().catch((error) => {
  console.error('Error during instrumentation:', error)
})

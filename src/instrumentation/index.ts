import { getProtectedApis } from './protectedApis'
import { patchFetch } from './patcher/fetch'
import { WritablePatcherContext } from './patcher/context'

async function main() {
  const FingerprintJS = window.FingerprintJS
  if (!FingerprintJS) {
    console.warn('FingerprintJS is not available, check your worker configuration.')
    return
  }

  const agent = await FingerprintJS.load()

  const patcherCtx = new WritablePatcherContext()
  const protectedApis = getProtectedApis()
  patchFetch({ protectedApis, ctx: patcherCtx })

  document.addEventListener('DOMContentLoaded', async () => {
    const signals = await agent.collect()
    patcherCtx.setSignals(signals)

    console.info('DOMContentLoaded triggered.', { signals })
  })
}

main().catch((error) => {
  console.error('Error during instrumentation:', error)
})

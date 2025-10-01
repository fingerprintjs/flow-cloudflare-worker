import { WritablePatcherContext } from './patcher/context'
import { getProtectedApis } from './protectedApis'
import { patchFetch } from './patcher/fetch/fetch'
import { setupSignalsCollection } from './signals'
import { FingerprintJSLoader } from './types'

export type InstrumentationParams = {
  fingerprintJs: Promise<FingerprintJSLoader>
}

/**
 * Sets up the complete instrumentation system for signals collection and request patching.
 *
 * This function initializes the entire instrumentation pipeline by setting up signals
 * collection, retrieving protected APIs configuration, and patching the requests to
 * automatically add security signals to requests targeting protected endpoints.
 *
 */
export async function setupInstrumentor({ fingerprintJs }: InstrumentationParams) {
  const patcherCtx = new WritablePatcherContext()

  await setupSignalsCollection({
    patcherCtx: patcherCtx,
    fingerprintJs,
  })

  const protectedApis = getProtectedApis()
  patchFetch({ protectedApis, ctx: patcherCtx })
}

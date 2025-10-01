import { WritablePatcherContext } from './patcher/context'
import { getProtectedApis } from './protectedApis'
import { patchFetch } from './patcher/fetch/fetch'
import { setupSignalsCollection } from './signals'
import { DocumentReadyStateFn, FingerprintJSLoader } from './types'

export type InstrumentationParams = {
  documentReadyState: DocumentReadyStateFn
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
export async function setupInstrumentor({ documentReadyState, fingerprintJs }: InstrumentationParams) {
  const patcherCtx = new WritablePatcherContext()
  await setupSignalsCollection({
    patcherCtx: patcherCtx,
    documentReadyState: documentReadyState,
    fingerprintJs: await fingerprintJs,
  })

  const protectedApis = getProtectedApis()
  patchFetch({ protectedApis, ctx: patcherCtx })
}

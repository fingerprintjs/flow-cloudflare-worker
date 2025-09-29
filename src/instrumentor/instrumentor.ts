import { WritablePatcherContext } from './patcher/context'
import { getProtectedApis } from './protectedApis'
import { patchFetch } from './patcher/fetch'
import { setupSignalsCollection } from './signals'

export type InstrumentationParams = {
  documentReadyState: () => string
}

/**
 * Sets up the complete instrumentation system for signals collection and request patching.
 *
 * This function initializes the entire instrumentation pipeline by setting up signals
 * collection, retrieving protected APIs configuration, and patching the requests to
 * automatically add security signals to requests targeting protected endpoints.
 *
 */
export async function setupInstrumentor({ documentReadyState }: InstrumentationParams) {
  const FingerprintJS = window.FingerprintJS
  if (!FingerprintJS) {
    console.warn('FingerprintJS is not available, check your worker configuration.')
    return
  }

  const patcherCtx = new WritablePatcherContext()
  await setupSignalsCollection(patcherCtx, documentReadyState)

  const protectedApis = getProtectedApis()
  patchFetch({ protectedApis, ctx: patcherCtx })
}

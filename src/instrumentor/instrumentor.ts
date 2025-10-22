import { WritablePatcherContext } from './patcher/context'
import { patchFetch } from './patcher/fetch/fetch'
import { setupPatcherContext } from './fingerprint/patcherContext'
import { FingerprintLoader } from '../shared-scripts/fingerprint/types'
import { ProtectedApi } from '../shared/types'
import { patchXHR } from './patcher/xhr/xhr'
import { patchForms } from './patcher/form/form'

export type InstrumentationParams = {
  fingerprintLoader: Promise<FingerprintLoader>
  protectedApis: ProtectedApi[]
  endpoint: string
}

/**
 * Sets up the complete instrumentation system for signals collection, request and form patching.
 *
 * This function initializes the entire instrumentation pipeline by setting up signals
 * collection, retrieving protected APIs configuration, and patching the requests to
 * automatically add security signals to requests targeting protected endpoints.
 *
 */
export async function setupInstrumentor({ fingerprintLoader, protectedApis, endpoint }: InstrumentationParams) {
  if (!protectedApis.length) {
    console.info('No protected APIs configured, skipping instrumentation.')
    return
  }

  const patcherCtx = new WritablePatcherContext(protectedApis)

  await setupPatcherContext({
    patcherCtx: patcherCtx,
    fingerprintLoader,
    endpoint,
  })

  patchForms(patcherCtx)
  patchFetch(patcherCtx)
  patchXHR(patcherCtx)
}

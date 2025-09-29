import { PatcherRequest } from './types'
import { ProtectedApi } from '../../shared/types'
import { PatcherContext } from './context'
import { isProtectedUrl } from './url'
import { SIGNALS_HEADER } from '../../shared/const'

/**
 * Parameters required for handling signals injection into requests.
 */
type HandleSignalsInjectionParams = {
  /** The request object that may receive signals injection */
  request: PatcherRequest
  /** Array of protected API configurations to check against */
  protectedApis: ProtectedApi[]
  /** Patcher context providing access to signals and other functionality */
  ctx: PatcherContext
}

/**
 * Handles the injection of fingerprinting signals into requests targeting protected APIs.
 *
 * This function checks if a request targets a protected URL and, if so, retrieves signals
 * from the patcher context and adds them as a header to the request. If the URL is not
 * protected or no signals are available, the function logs appropriate debug/warning messages.
 *
 * @param params - Configuration object containing the request, protected APIs, and context
 * @param params.request - The request object that may receive signals injection
 * @param params.protectedApis - Array of protected API configurations to check against
 * @param params.ctx - Patcher context providing access to signals and other functionality
 *
 * @example
 * ```typescript
 * await handleSignalsInjection({
 *   request: patcherRequest,
 *   protectedApis: [{ url: 'https://api.example.com', method: 'POST' }],
 *   ctx: patcherContext
 * });
 * ```
 */
export async function handleSignalsInjection({ request, protectedApis, ctx }: HandleSignalsInjectionParams) {
  if (!isProtectedUrl(request, protectedApis)) {
    console.debug('Skipping signals injection:', request?.url)
    return
  }

  console.debug('Injecting signals:', request.url)

  const signals = await ctx.getSignals()

  if (signals) {
    console.debug('Adding signals header for:', request.url)
    request.setHeader(SIGNALS_HEADER, signals)
    return
  }

  console.warn('No signals data found.')
}

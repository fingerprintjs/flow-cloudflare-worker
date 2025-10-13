import { PatcherRequest } from './types'
import { PatcherContext } from './context'
import { SIGNALS_HEADER } from '../../shared/const'

/**
 * Parameters required for handling signals injection into requests.
 */
type HandleSignalsInjectionParams = {
  /** The request object that may receive signals injection */
  request: PatcherRequest
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
 * @param params - Configuration object containing the request and context
 * @param params.request - The request object that may receive signals injection
 * @param params.ctx - Patcher context providing access to signals and other functionality
 *
 * @returns A boolean indicating whether signals were injected successfully
 *
 */
export async function handleSignalsInjection({ request, ctx }: HandleSignalsInjectionParams): Promise<boolean> {
  if (!ctx.isProtectedUrl(request.url, request.method)) {
    console.debug('Skipping signals injection:', request.url)
    return false
  }

  console.debug('Injecting signals:', request.url)

  const signals = await ctx.getSignals()

  if (signals) {
    console.debug('Adding signals header for:', request.url)
    request.setHeader(SIGNALS_HEADER, signals)
    return true
  }

  console.warn('No signals data found.')

  return false
}

import { PatcherRequest } from './types'
import { PatcherContext } from './context'
import { logger } from '../../shared/logger'
import { APP_INCLUDED_CREDENTIALS_FLAG, SIGNALS_KEY } from '../../../shared/const'

/**
 * Parameters required for handling signals injection into requests.
 */
type CollectSignalsParams = {
  /** The request object that may receive signals injection */
  request: PatcherRequest
  /** Patcher context providing access to signals and other functionality */
  ctx: PatcherContext
}

/**
 * Handles the injection of fingerprinting signals into requests targeting protected APIs.
 * Collects fingerprinting signals if the request targets a protected API.
 *
 * This function checks if a request targets a protected URL and, if so, retrieves signals
 * from the patcher context and returns them. If the URL is not protected or no signals
 * are available, the function logs appropriate debug/warning messages.
 *
 * @param params - Configuration object containing the request and context
 * @param params.request - The request object that may receive signals injection
 * @param params.ctx - Patcher context providing access to signals and other functionality
 *
 * @returns the signals; undefined if no signals were collected.
 */
export async function collectSignalsForProtectedUrl({
  request,
  ctx,
}: CollectSignalsParams): Promise<string | undefined> {
  if (!ctx.isProtectedUrl(request.url, request.method)) {
    logger.debug('Skipping signals injection:', request.url)
    return undefined
  }

  logger.debug('Injecting signals:', request.url)

  const signals = await ctx.getSignals()

  if (!signals) {
    logger.warn('No signals data found.')
  }

  return signals
}

export type SignalInjectionResult = {
  /** true if the application configured the request to include credentials in a cross-origin request */
  appIncludedCredentials: boolean
}

/**
 * Inject the fingerprinting signals into the request
 *
 * @param request the `PatcherRequest` to modify
 * @param signals the signals to inject
 *
 * @returns the results of signal injection as a `SignalInjectionResult`
 */
export function injectSignalsIntoRequest(request: PatcherRequest, signals: string): SignalInjectionResult {
  const appIncludedCredentials = request.setIncludeCredentials()
  if (appIncludedCredentials) {
    request.setHeader(SIGNALS_KEY, `${APP_INCLUDED_CREDENTIALS_FLAG}${signals}`)
  } else {
    request.setHeader(SIGNALS_KEY, signals)
  }
  return { appIncludedCredentials }
}

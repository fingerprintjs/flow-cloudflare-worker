import { PatcherContext } from '../context'
import { ProtectedApi } from '../../../../shared/types'
import { collectSignalsForProtectedUrl, injectSignalsIntoRequest } from '../signalsInjection'
import { resolvePatcherRequest } from './patcherRequest'
import { AGENT_DATA_HEADER } from '../../../../shared/const'
import { logger } from '../../../shared/logger'
import {
  extractBusinessContextFromBody,
  extractBusinessContextFromHeaders,
  extractBusinessContextFromRequest,
  extractBusinessContextFromWindow,
  resolveBusinessContext,
} from '../businessContext'

/**
 * Parameters required for patching the fetch API.
 */
export type PatchFetchParams = {
  /** Array of protected APIs that should have signals attached to their requests */
  protectedApis: ProtectedApi[]
  /** Context object providing access to signals and other patcher functionality */
  ctx: PatcherContext
}

/**
 * Patches the global fetch API to automatically add Fingerprint signals to requests made to protected APIs.
 *
 * This function intercepts all fetch requests and checks if they target protected URLs. For protected
 * requests, it adds a signals' header before forwarding the request.
 *
 * @param ctx - Patcher context providing access to signals and other functionality
 *
 */
export function patchFetch(ctx: PatcherContext) {
  if (typeof window.fetch !== 'function') {
    logger.warn('window.fetch is not available.')

    return
  }

  const originalFetch = window.fetch

  window.fetch = async (...params) => {
    let signals: string | undefined = undefined

    let actualParams: Parameters<typeof fetch> = params
    try {
      logger.debug('Incoming fetch request', params)

      const result = resolvePatcherRequest(params)

      if (result) {
        const [request, updatedParams] = result

        logger.debug('Resolved fetch request and updated params:', request, updatedParams)

        // Resolve business context only for protected URLs — body parsing can be expensive
        if (ctx.isProtectedUrl(request.url, request.method)) {
          const businessContext = await resolveFetchBusinessContext(params)
          signals = await collectSignalsForProtectedUrl({ request, ctx, businessContext })
          if (signals) {
            injectSignalsIntoRequest(request, signals)
            actualParams = updatedParams
          }
        }
      }
    } catch (error) {
      logger.error('Patched fetch error:', error)
    }

    const response = await originalFetch(...actualParams)

    try {
      if (signals) {
        const agentData = response.headers.get(AGENT_DATA_HEADER)

        if (agentData) {
          ctx.processAgentData(agentData)
        } else {
          logger.warn('Agent data not found in response')
        }
      }
    } catch (e) {
      logger.error('Error processing agent data:', e)
    }

    return response
  }

  logger.debug('Fetch patched successfully.')
}

/**
 * Resolves business context from fetch arguments.
 *
 * For `fetch(Request, init)`, `init` overrides the Request the same way the Fetch API does:
 * init.headers replace Request headers when present; init.body replaces Request body when `body` is set.
 */
async function resolveFetchBusinessContext(params: Parameters<typeof fetch>) {
  const windowSource = extractBusinessContextFromWindow()
  const input = params[0]
  const init = params[1]

  if (input instanceof Request) {
    const headers = init?.headers != null ? new Headers(init.headers) : input.headers
    const headersSource = extractBusinessContextFromHeaders(headers)
    const bodySource =
      init != null && 'body' in init
        ? await extractBusinessContextFromBody(init.body, headers.get('content-type'))
        : await extractBusinessContextFromRequest(input)

    return resolveBusinessContext({
      body: bodySource,
      headers: headersSource,
      window: windowSource,
    })
  }

  const headers = init?.headers != null ? new Headers(init.headers) : undefined
  const headersSource = extractBusinessContextFromHeaders(headers)
  const bodySource = await extractBusinessContextFromBody(init?.body, headers?.get('content-type'))

  return resolveBusinessContext({
    body: bodySource,
    headers: headersSource,
    window: windowSource,
  })
}

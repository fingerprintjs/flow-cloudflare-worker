import { AGENT_DATA_HEADER } from '../../shared/const'
import { IngressClient, SendResult } from '../fingerprint/ingress'
import { fetchOrigin } from '../utils/origin'

/**
 * Parameters required for handling a protected API call.
 */
export type HandleProtectedApiCallParams = {
  /** The incoming HTTP request to be processed */
  request: Request
  /** Client for sending fingerprinting data to the ingress service */
  ingressClient: IngressClient
}

/**
 * Handles a protected API call by validating signals and processing the request.
 *
 * This function performs the following operations:
 * 1. Validates that the request contains required fingerprinting signals
 * 2. Sends the request to both ingress and origin services
 * 3. Merges headers from the ingress response into the origin response
 * 4. Returns the combined response with updated headers
 *
 * @param params - Configuration object containing request, ingress client, and error response
 * @returns Promise resolving to the processed HTTP response
 *
 * @example
 * ```typescript
 * const response = await handleProtectedApiCall({
 *   request: incomingRequest,
 *   ingressClient: new IngressClient('<...>'),
 * });
 * ```
 */
export async function handleProtectedApiCall({
  request,
  ingressClient,
}: HandleProtectedApiCallParams): Promise<Response> {
  const ingressResponse = await ingressClient.send(request)

  let originResponse: Response
  if (ingressResponse.rulesetProcessor) {
    originResponse = await ingressResponse.rulesetProcessor(request)
  } else {
    // TODO Once ruleset is implemented in Warden, this should be removed
    console.warn('No ruleset processor found for ingress response, falling back to fetchOrigin.')
    originResponse = await fetchOrigin(request)
  }

  const originResponseHeaders = new Headers(originResponse.headers)
  setHeadersFromIngressToOrigin(ingressResponse, originResponseHeaders)

  // Re-create the response, because by default its headers are immutable, even if we were to use `originResponse.clone()`
  return new Response(originResponse.body, {
    status: originResponse.status,
    headers: originResponseHeaders,
    statusText: originResponse.statusText,
    cf: originResponse.cf,
  })
}

/**
 * Merges headers from the ingress response into the origin response headers.
 *
 * This function extracts agent data and set-cookie headers from the ingress response
 * and adds them to the origin response headers. The agent data is set as a custom
 * header, while cookie headers are appended to preserve existing cookies.
 *
 * @param ingressResponse - Result from the ingress service containing agent data and cookies
 * @param originResponseHeaders - Mutable headers object from the origin response to be modified
 *
 */
function setHeadersFromIngressToOrigin(ingressResponse: SendResult, originResponseHeaders: Headers) {
  const { agentData, setCookieHeaders } = ingressResponse
  console.debug('Adding agent data header', agentData)
  originResponseHeaders.set(AGENT_DATA_HEADER, agentData)

  if (setCookieHeaders.length) {
    console.debug('Adding set-cookie headers from ingress response', setCookieHeaders)
    setCookieHeaders.forEach((cookie) => {
      originResponseHeaders.append('Set-Cookie', cookie)
    })
  }
}

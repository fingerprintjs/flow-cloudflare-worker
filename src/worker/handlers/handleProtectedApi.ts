import { AGENT_DATA_HEADER } from '../../shared/const'
import { IdentificationClient, SendResult } from '../fingerprint/identificationClient'
import { processRuleset, RuleActionUnion } from '../fingerprint/ruleset'
import { hasContentType, isDocumentDestination } from '../utils/headers'
import { injectAgentProcessorScript } from '../scripts'
import { fetchOrigin } from '../utils/origin'

/**
 * Parameters required for handling a protected API call.
 */
export type HandleProtectedApiCallParams = {
  /** The incoming HTTP request to be processed */
  request: Request
  /** Client for sending fingerprinting data to the ingress service */
  identificationClient: IdentificationClient
  /** Fallback rule if identification client rule evaluation fails */
  fallbackRule: RuleActionUnion
  /** Route prefix for the worker requests */
  routePrefix: string
  /** Flag that determines whether worker is in Monitor Mode */
  isMonitorMode: boolean
}

/**
 * Handles a protected API call by validating signals and processing the request.
 * For HTML responses, injects the agent processor script into the <head> element to process the agent data.
 */
export async function handleProtectedApiCall({
  request,
  identificationClient,
  fallbackRule,
  routePrefix,
  isMonitorMode,
}: HandleProtectedApiCallParams): Promise<Response> {
  const [response, agentData] = await getResponseForProtectedCall({
    request,
    identificationClient,
    fallbackRule,
    isMonitorMode,
  })

  /**
   * For HTML responses, inject the agent processor script into the <head> element to process the agent data.
   * */
  if (
    agentData &&
    hasContentType(response.headers, 'text/html') &&
    // This check protects against false-positive HTML requests triggered by a "fetch" call. (e.g. by htmx)
    isDocumentDestination(request.headers)
  ) {
    console.info('Injecting agent processor script into HTML response.')
    return injectAgentProcessorScript(response, agentData, routePrefix)
  }

  return response
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
 */
async function getResponseForProtectedCall({
  request,
  identificationClient,
  fallbackRule,
  isMonitorMode,
}: Omit<HandleProtectedApiCallParams, 'routePrefix'>): Promise<[response: Response, agentData: string | null]> {
  let ingressResponse: SendResult
  let originRequest: Request
  let signals: string

  try {
    const result = await IdentificationClient.parseIncomingRequest(request)
    signals = result.signals
    originRequest = result.request
  } catch (e) {
    console.error('Failed to parse incoming request:', e)
    return [await handleFallbackRule(request, fallbackRule, isMonitorMode), null]
  }

  try {
    ingressResponse = await identificationClient.send(originRequest, signals)
  } catch (error) {
    console.error('Error sending request to ingress service:', error)
    return [await handleFallbackRule(originRequest, fallbackRule, isMonitorMode), null]
  }

  let originResponse: Response

  if (isMonitorMode) {
    originResponse = await fetchOrigin(originRequest)
  } else {
    if (ingressResponse.ruleAction) {
      originResponse = await processRuleset(ingressResponse.ruleAction, originRequest)
    } else {
      console.warn('No ruleset processor found for ingress response, using fallback rule.')
      originResponse = await processRuleset(fallbackRule, originRequest)
    }
  }

  const originResponseHeaders = new Headers(originResponse.headers)
  // For requests whose destination is a document (these are typically triggered by submitting a form or clicking a link)
  // it doesn't make sense to set headers from ingress, because the browser will discard them anyway
  if (!isDocumentDestination(request.headers)) {
    setHeadersFromIngressToOrigin(ingressResponse, originResponseHeaders)
  }

  // Re-create the response, because by default its headers are immutable, even if we were to use `originResponse.clone()`
  return [
    new Response(originResponse.body, {
      status: originResponse.status,
      headers: originResponseHeaders,
      statusText: originResponse.statusText,
      cf: originResponse.cf,
    }),
    ingressResponse.agentData,
  ]
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

  if (setCookieHeaders?.length) {
    console.debug('Adding set-cookie headers from ingress response', setCookieHeaders)
    setCookieHeaders.forEach((cookie) => {
      originResponseHeaders.append('Set-Cookie', cookie)
    })
  }
}

/**
 * Handles the fallback rule for the given request based on the mode.
 * If `isMonitorMode` is true, the function fetches data from the origin.
 * Otherwise, it processes the ruleset using the provided fallback rule.
 *
 * @param {Request} request - The incoming request object to be processed.
 * @param {RuleActionUnion} fallbackRule - The fallback rule to be applied to the request.
 * @param {boolean} [isMonitorMode=false] - Indicates whether the function operates in monitor mode.
 * @return {Promise<Response>} A promise that resolves to the response after processing the request.
 */
function handleFallbackRule(
  request: Request,
  fallbackRule: RuleActionUnion,
  isMonitorMode: boolean = false
): Promise<Response> {
  if (isMonitorMode) {
    return fetchOrigin(request)
  }

  return processRuleset(fallbackRule, request)
}

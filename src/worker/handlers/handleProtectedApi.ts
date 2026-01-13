import { AGENT_DATA_HEADER } from '../../shared/const'
import { IdentificationClient, SendResult } from '../fingerprint/identificationClient'
import { processRuleset } from '../fingerprint/ruleset'
import { hasContentType, isDocumentDestination } from '../utils/headers'
import { injectAgentProcessorScript } from '../scripts'
import { fetchOrigin } from '../utils/origin'
import { TypedEnv } from '../types'
import { getFallbackRuleAction, getRoutePrefix, isMonitorMode } from '../env'
import { setCorsHeadersForInstrumentation } from '../utils/request'
import { copyResponseWithNewHeaders } from '../utils/response'

/**
 * Parameters required for handling a protected API call.
 */
export type HandleProtectedApiCallParams = {
  /** The incoming HTTP request to be processed */
  request: Request
  /** Client for sending fingerprinting data to the ingress service */
  identificationClient: IdentificationClient
  /** The environment for the request*/
  env: TypedEnv
}

/**
 * Handles a protected API call by validating signals and processing the request.
 * For HTML responses, injects the agent processor script into the <head> element to process the agent data.
 */
export async function handleProtectedApiCall({
  request,
  identificationClient,
  env,
}: HandleProtectedApiCallParams): Promise<Response> {
  const [response, agentData] = await getResponseForProtectedCall({
    request,
    identificationClient,
    env,
  })

  setCorsHeadersForInstrumentation(request, response.headers)

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
    return injectAgentProcessorScript(response, agentData, getRoutePrefix(env))
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
 *
 * @returns the `Response` and optional data that needs to be sent back to the agent. The `Headers`
 *          on the `Response` are mutable.
 */
async function getResponseForProtectedCall({
  request,
  identificationClient,
  env,
}: HandleProtectedApiCallParams): Promise<[response: Response, agentData: string | null]> {
  let ingressResponse: SendResult
  let originRequest: Request
  let signals: string
  let clientCookie: string | undefined
  let includedCrossOriginCredentials: boolean

  try {
    const result = await IdentificationClient.parseIncomingRequest(request)
    signals = result.signals
    originRequest = result.originRequest
    clientCookie = result.clientCookie
    includedCrossOriginCredentials = result.includedCrossOriginCredentials
  } catch (e) {
    console.error('Failed to parse incoming request:', e)
    return [await handleFallbackRule(request, env), null]
  }

  try {
    ingressResponse = await identificationClient.send(originRequest, signals, clientCookie)
  } catch (error) {
    console.error('Error sending request to ingress service:', error)
    return [await handleFallbackRule(originRequest, env), null]
  }

  let originResponse: Response

  if (isMonitorMode(env)) {
    originResponse = await fetchOrigin(originRequest)
  } else {
    if (ingressResponse.ruleAction) {
      originResponse = await processRuleset(ingressResponse.ruleAction, originRequest, env)
    } else {
      console.warn('No ruleset processor found for ingress response, using fallback rule.')
      originResponse = await processRuleset(getFallbackRuleAction(env), originRequest, env)
    }
  }

  const originResponseHeaders = new Headers(originResponse.headers)
  // For requests whose destination is a document (these are typically triggered by submitting a form or clicking a link)
  // it doesn't make sense to set headers from ingress, because the browser will discard them anyway
  if (!isDocumentDestination(request.headers)) {
    setHeadersFromIngressToOrigin(ingressResponse, originResponseHeaders, includedCrossOriginCredentials)
  }

  // Re-create the response, because by default its headers are immutable, even if we were to use `originResponse.clone()`
  return [copyResponseWithNewHeaders(originResponse, originResponseHeaders), ingressResponse.agentData]
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
 * @param includedCrossOriginCredentials - true if the instrumented request is cross-origin and included credentials (i.e., cookies) for identification purposes
 *
 */
function setHeadersFromIngressToOrigin(
  ingressResponse: SendResult,
  originResponseHeaders: Headers,
  includedCrossOriginCredentials: boolean
) {
  const { agentData, setCookieHeaders } = ingressResponse
  console.debug('Adding agent data header', agentData)
  originResponseHeaders.set(AGENT_DATA_HEADER, agentData)

  if (includedCrossOriginCredentials) {
    // Delete any cookies set by the origin, they would have been ignored
    // by the browser if the request was not instrumented.
    originResponseHeaders.delete('Set-Cookie')
  }

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
 * @param {TypedEnv} env - The environment for the request
 * @return {Promise<Response>} A promise that resolves to the response after processing the request.
 */
function handleFallbackRule(request: Request, env: TypedEnv): Promise<Response> {
  if (isMonitorMode(env)) {
    return fetchOrigin(request)
  }

  return processRuleset(getFallbackRuleAction(env), request, env)
}

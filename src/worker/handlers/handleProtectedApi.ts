import { AGENT_DATA_HEADER } from '../../shared/const'
import { IdentificationClient, SendResult } from '../fingerprint/identificationClient'
import { processRuleset, RuleActionUnion } from '../fingerprint/ruleset'
import { hasContentType } from '../utils/headers'
import { getScriptUrl } from '../scripts'

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
}: HandleProtectedApiCallParams): Promise<Response> {
  const [response, agentData] = await getResponseForProtectedCall({
    request,
    identificationClient,
    fallbackRule,
  })

  /**
   * For HTML responses, inject the agent processor script into the <head> element to process the agent data.
   * */
  if (agentData && hasContentType(response.headers, 'text/html')) {
    console.info('Injecting agent processor script into HTML response.')
    return new HTMLRewriter()
      .on('head', {
        element(element) {
          console.info('Injecting agent processor script into <head> element.')

          // Append script that loads the agent processor. Injects agent data as a data attribute.
          element.append(
            `<script data-agent-data="${agentData}" defer src="${getScriptUrl('agent-processor.iife.js', routePrefix)}"></script>\n`,
            {
              html: true,
            }
          )
        },
      })
      .transform(response)
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
}: Omit<HandleProtectedApiCallParams, 'routePrefix'>): Promise<[response: Response, agentData: string | null]> {
  let ingressResponse: SendResult
  let originRequest: Request
  let signals: string

  try {
    ;[signals, originRequest] = await IdentificationClient.parseIncomingRequest(request)
  } catch (e) {
    console.error('Failed to parse incoming request:', e)
    return [await processRuleset(fallbackRule, request), null]
  }

  try {
    ingressResponse = await identificationClient.send(originRequest, signals)
  } catch (error) {
    console.error('Error sending request to ingress service:', error)
    return [await processRuleset(fallbackRule, originRequest), null]
  }

  let originResponse: Response
  if (ingressResponse.ruleAction) {
    originResponse = await processRuleset(ingressResponse.ruleAction, originRequest)
  } else {
    console.warn('No ruleset processor found for ingress response, using fallback rule.')
    originResponse = await processRuleset(fallbackRule, originRequest)
  }

  const originResponseHeaders = new Headers(originResponse.headers)
  setHeadersFromIngressToOrigin(ingressResponse, originResponseHeaders)

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

  if (setCookieHeaders.length) {
    console.debug('Adding set-cookie headers from ingress response', setCookieHeaders)
    setCookieHeaders.forEach((cookie) => {
      originResponseHeaders.append('Set-Cookie', cookie)
    })
  }
}

import { Region } from './region'
import { SIGNALS_HEADER } from '../../shared/const'
import { IngressRequestFailedError, SignalsNotAvailableError } from '../errors'
import { getHeaderOrThrow } from '../utils/headers'
import { findCookie } from '../cookies'
import { makeRulesetProcessor, RuleAction, RulesetProcessor } from './ruleset'

/**
 * Request body structure for sending fingerprint data to the ingress service.
 *
 * Is in camelCase format until https://fingerprintjs.atlassian.net/browse/PLAT-1437 is resolved
 */
type SendBody = {
  /** Fingerprint data with signals */
  fingerprintData: string
  /** Client's host header value */
  clientHost: string
  /** Client's IP address from Cloudflare headers */
  clientIP: string
  /** Client's user agent string */
  clientUserAgent: string
  /** Optional client cookie data (filtered to include only _iidt cookie) */
  clientCookie?: string
  /** Optional additional client headers (excluding cookies) */
  clientHeaders?: Record<string, string>
}

/**
 * Response structure from the ingress service.
 *
 * Is in camelCase format until https://fingerprintjs.atlassian.net/browse/PLAT-1437 is resolved. Afterwards we can start using the /v4/send version of the endpoint.
 */
export type SendResponse = {
  /** Agent data returned by the ingress service */
  agentData: string
  /** Rule action resolved by ingress. */
  ruleAction?: RuleAction
}

/**
 * Extended response structure that includes both agent data and cookie headers.
 */
export type SendResult = SendResponse & {
  /** Array of Set-Cookie header values to be sent to the client */
  setCookieHeaders: string[]
  /** Optional ruleset processor function to be used for processing the origin request */
  rulesetProcessor?: RulesetProcessor | undefined
}

/**
 * Client for communicating with the ingress service.
 * Handles region-based URL resolution, request formatting, and response processing.
 */
export class IngressClient {
  private readonly url: URL

  /**
   * Creates a new IngressClient instance.
   * @param region - The region for URL resolution (e.g., 'us', 'eu')
   * @param baseUrl - Base URL for the ingress service
   * @param apiKey - API key for authentication with the ingress service
   */
  constructor(
    region: Region,
    baseUrl: string,
    private readonly apiKey: string
  ) {
    const resolvedUrl = IngressClient.resolveUrl(region, baseUrl)
    console.debug('Resolved ingress URL:', resolvedUrl)
    this.url = new URL(resolvedUrl)
  }

  /**
   * Sends fingerprint data to the ingress service and returns the response with agent data.
   *
   * This method:
   * 1. Extracts fingerprint signals and client information from the request
   * 2. Processes cookies to extract only the _iidt cookie if present
   * 3. Sends the data to the POST /send
   * 4. Returns the agent data along with any Set-Cookie headers received from the ingress
   *
   * @param clientRequest - The incoming client request containing fingerprint data and headers
   * @returns Promise resolving to SendResult containing agent data and cookie headers
   * @throws {SignalsNotAvailableError} When fingerprint signals are missing from the request
   * @throws {IngressRequestFailedError} When the ingress service request fails or returns invalid data
   */
  async send(clientRequest: Request): Promise<SendResult> {
    const signals = clientRequest.headers.get(SIGNALS_HEADER)
    if (!signals) {
      throw new SignalsNotAvailableError()
    }

    const clientIP = getHeaderOrThrow(clientRequest.headers, 'cf-connecting-ip')
    const clientHost = getHeaderOrThrow(clientRequest.headers, 'host')
    const clientUserAgent = getHeaderOrThrow(clientRequest.headers, 'user-agent')
    const clientCookie = clientRequest.headers.get('cookie')

    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Auth-API-Key', this.apiKey)

    const clientHeaders = new Headers(clientRequest.headers)
    clientHeaders.delete('cookie')

    let cookieToSend: string | undefined
    if (clientCookie) {
      // Try to find _iidt cookie
      const iidtMatch = findCookie(clientCookie, '_iidt')
      if (iidtMatch) {
        cookieToSend = iidtMatch
      }
    }

    const sendBody: SendBody = {
      clientIP,
      clientHost,
      clientUserAgent,
      fingerprintData: signals,
    }

    if (cookieToSend) {
      sendBody.clientCookie = cookieToSend
    }

    const clientHeadersEntries = Array.from(clientHeaders.entries())
    if (clientHeadersEntries.length) {
      sendBody.clientHeaders = Object.fromEntries(clientHeadersEntries)
    }

    const requestUrl = new URL(this.url)
    requestUrl.pathname = '/send'

    const ingressRequest = new Request(requestUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(sendBody),
    })

    const ingressResponse = await fetch(ingressRequest)
    console.debug(`Received ingress response for ${requestUrl} request with status:`, ingressResponse.status)
    if (!ingressResponse.ok) {
      const errorText = await ingressResponse.text()
      console.error(`Ingress request failed with status: ${ingressResponse.status}`, errorText)
      throw new IngressRequestFailedError(errorText, ingressResponse.status)
    }

    const ingressData = await ingressResponse.json<SendResponse>()
    console.debug(`Ingress response data:`, ingressData)
    if (!ingressData.agentData) {
      throw new IngressRequestFailedError('Ingress response does not contain agent data', ingressResponse.status)
    }

    const cookiesToSend = ingressResponse.headers.getAll('Set-Cookie')

    return {
      ...ingressData,
      setCookieHeaders: cookiesToSend,

      rulesetProcessor: ingressData.ruleAction ? makeRulesetProcessor(ingressData.ruleAction) : undefined,
    }
  }

  /**
   * Resolves the full ingress service URL based on the region and host.
   *
   * For the 'us' region, uses the host directly without a regional prefix.
   * For all other regions, prefixes the host with the region name.
   *
   * @param region - The target region (e.g., 'us', 'eu', 'ap')
   * @param host - The base host name for the ingress service
   * @returns The complete HTTPS URL for the ingress service
   *
   * @example
   * resolveUrl('us', 'api.example.com') // returns 'https://api.example.com'
   * resolveUrl('eu', 'api.example.com') // returns 'https://eu.api.example.com'
   */
  private static resolveUrl(region: Region, host: string) {
    switch (region) {
      case 'us':
        return `https://${host}`

      default:
        return `https://${region}.${host}`
    }
  }
}

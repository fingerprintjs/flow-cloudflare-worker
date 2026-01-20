import { Region } from './region'
import { APP_INCLUDED_CREDENTIALS_FLAG, SIGNALS_KEY } from '../../shared/const'
import { IdentificationRequestFailedError, SignalsNotAvailableError } from '../errors'
import { getHeaderOrThrow, getIp, hasContentType } from '../utils/headers'
import { findCookie } from '../cookies'
import { RuleAction } from './ruleset'
import { copyRequest, getCrossOriginValue } from '../utils/request'
import { z } from 'zod/v4'
import { handleTampering } from './tampering'
import { TypedEnv } from '../types'
import { getFpRegion, getIngressBaseHost, getRoutePrefix, getRulesetId, getSecretKey } from '../env'

type RulesetContext = {
  ruleset_id: string
}
/**
 * Request body structure for sending fingerprint data to the identification service.
 *
 */
export type SendBody = {
  /** Fingerprint data with signals */
  fingerprint_data: string
  /** Client's host header value */
  client_host: string
  /** Client's IP address from Cloudflare headers */
  client_ip: string
  /** Client's user agent string */
  client_user_agent: string
  /** Optional client cookie data (filtered to include only _iidt cookie) */
  client_cookie?: string
  /** Optional additional client headers (excluding cookies) */
  client_headers?: Record<string, string>
  /** Ruleset context for rule action evaluation */
  ruleset_context?: RulesetContext
}

export const IdentificationEvent = z.object({
  replayed: z.boolean(),
  timestamp: z.coerce.date(),
  url: z.url(),
  ip_address: z.ipv4().or(z.ipv6()),
})

export type IdentificationEvent = z.infer<typeof IdentificationEvent>

export const SendResponse = z.object({
  // Agent data returned by the identification service
  agent_data: z.string(),
  // Rule action resolved by the identification service
  rule_action: RuleAction.optional(),
  // Cookies that need to be set in the origin response
  set_cookie_headers: z.array(z.string()).optional(),

  event: IdentificationEvent,
})

export type SendResponse = z.infer<typeof SendResponse>
/**
 * Extended response structure that includes both agent data and cookie headers.
 */
export type SendResult = {
  /** Agent data returned by the identification service */
  agentData: string
  /** Array of Set-Cookie header values to be sent to the client */
  setCookieHeaders?: string[] | undefined
  /** Optional rule action that was resolved by ingress */
  ruleAction: RuleAction | undefined
}

export type ParsedIncomingRequest = {
  /** The signals extracted from a request */
  signals: string

  /**
   * Identification requires that cookies be sent in cross-origin requests. But
   * the application may not have requested this behavior.
   *
   * This flag will be true when the request is a cross-origin request
   * and the application did not request that cookies be included in the request,
   * indicating that both Cookies and Set-Cookie header fields must not be sent between the origin
   * and the client.
   */
  removeCookies: boolean

  /** The request with signals and optionally, cookies omitted, suitable for forwarding to the origin */
  originRequest: Request

  /** The cookie from the request that needs to be included in the identification request */
  clientCookie: string | undefined
}

/**
 * Client for communicating with the identification service.
 * Handles region-based URL resolution, request formatting, and response processing.
 */
export class IdentificationClient {
  private readonly url: URL

  /**
   * Creates a new IdentificationClient instance.
   * @param region - The region for URL resolution (e.g., 'us', 'eu')
   * @param baseUrl - Base URL hostname for the identification service, e.g. "api.fpjs.io"
   * @param apiKey - API key for authentication with the identification service
   * @param routePrefix - Path prefix for worker requests.
   * @param rulesetId - If of ruleset that will be evaluated by the identification service.
   */
  constructor(
    region: Region,
    baseUrl: string,
    private readonly apiKey: string,
    private readonly routePrefix: string,
    private readonly rulesetId?: string
  ) {
    const resolvedUrl = IdentificationClient.resolveUrl(region, baseUrl)
    console.debug('Resolved identification URL:', resolvedUrl)
    this.url = new URL(resolvedUrl)
  }

  static fromEnv(env: TypedEnv) {
    return new this(
      getFpRegion(env),
      getIngressBaseHost(env),
      getSecretKey(env),
      getRoutePrefix(env),
      getRulesetId(env)
    )
  }

  /**
   * Sends fingerprint data to the identification service and returns the response with agent data.
   *
   * This method:
   * 1. Sends the data to the POST /send
   * 2. Returns the agent data along with any Set-Cookie headers received from the identification
   *
   * @param clientRequest - The incoming client request containing fingerprint data and headers
   * @param signals - Fingerprint signals extracted from the request
   * @param clientCookie - The optional client cookie to send along with the fingerprint data
   * @returns Promise resolving to SendResult containing agent data and cookie headers
   * @throws {SignalsNotAvailableError} When fingerprint signals are missing from the request
   * @throws {IdentificationRequestFailedError} When the identification service request fails or returns invalid data
   */
  async send(clientRequest: Request, signals: string, clientCookie?: string): Promise<SendResult> {
    const clientIP = await getIp(clientRequest.headers)
    const clientHost = getHeaderOrThrow(clientRequest.headers, 'host')
    const clientUserAgent = getHeaderOrThrow(clientRequest.headers, 'user-agent')

    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Authorization', `Bearer ${this.apiKey}`)

    const clientHeaders = new Headers(clientRequest.headers)
    clientHeaders.delete('cookie')

    const sendBody: SendBody = {
      client_ip: clientIP,
      client_host: clientHost,
      client_user_agent: clientUserAgent,
      fingerprint_data: signals,
      ...(this.rulesetId ? { ruleset_context: { ruleset_id: this.rulesetId } } : {}),
    }

    if (clientCookie) {
      sendBody.client_cookie = clientCookie
    }

    const clientHeadersEntries = Array.from(clientHeaders.entries())
    if (clientHeadersEntries.length) {
      sendBody.client_headers = Object.fromEntries(clientHeadersEntries)
    }

    const requestUrl = new URL(this.url)
    requestUrl.pathname = '/v4/send'

    const identificationRequest = new Request(requestUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(sendBody),
    })

    console.debug(`Sending identification request to ${requestUrl}`, identificationRequest)

    const identificationResponse = await fetch(identificationRequest)
    console.debug(
      `Received identification response for ${requestUrl} request with status:`,
      identificationResponse.status
    )
    if (!identificationResponse.ok) {
      const errorText = await identificationResponse.text()
      console.error(`Identification request failed with status: ${identificationResponse.status}`, errorText)
      throw new IdentificationRequestFailedError(errorText, identificationResponse.status)
    }

    const identificationDataValidation = SendResponse.safeParse(await identificationResponse.json())
    if (!identificationDataValidation.success) {
      console.error(`Identification response data is invalid:`, identificationDataValidation.error)

      throw new IdentificationRequestFailedError(
        `Identification response data is invalid: ${identificationDataValidation.error.message}`,
        identificationResponse.status
      )
    }

    const identificationData = identificationDataValidation.data
    console.debug(`Identification response data:`, identificationData)

    await handleTampering(identificationData.event, clientRequest)

    return {
      setCookieHeaders: identificationData.set_cookie_headers,
      agentData: identificationData.agent_data,
      ruleAction: identificationData.rule_action,
    }
  }

  /**
   * Handles the browser cache request by modifying the client request and forwarding it to the configured ingress URL.
   *
   * @param {Request} clientRequest - The original request from the client.
   * @return {Promise<Response>} - A promise that resolves to the response from the forwarded request.
   */
  async browserCache(clientRequest: Request): Promise<Response> {
    const clientRequestUrl = new URL(clientRequest.url)

    // Remove the route prefix from the path
    const path = clientRequestUrl.pathname.replace(`/${this.routePrefix}`, '')
    const ingressUrl = new URL(path, this.url)
    ingressUrl.search = clientRequestUrl.search

    const headers = new Headers(clientRequest.headers)
    headers.delete('cookie')

    const request = copyRequest({ request: clientRequest, init: { headers }, url: ingressUrl })
    console.debug(`Sending browser cache request to ${ingressUrl}`, request)

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return fetch(request as unknown as Request<unknown, IncomingRequestCfProperties>)
  }

  /**
   * Resolves the full identification service URL based on the region and host.
   *
   * For the 'us' region, uses the host directly without a regional prefix.
   * For all other regions, prefixes the host with the region name.
   *
   * @param region - The target region (e.g., 'us', 'eu', 'ap')
   * @param host - The base host name for the identification service
   * @returns The complete HTTPS URL for the identification service
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

  /**
   * Parses an incoming request to extract signals, while returning a modified iteration of the request with signals removed.
   *
   * @param {Request} request The incoming HTTP request to be processed.
   * @return {Promise<{ParsedIncomingRequest}>} A promise that resolves with data parsed from the incoming request
   * @throws {SignalsNotAvailableError} If signals are not found in the request headers or body.
   */
  static async parseIncomingRequest(request: Request): Promise<ParsedIncomingRequest> {
    // First, try to find signals in headers
    const signals = request.headers.get(SIGNALS_KEY)
    if (signals) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.delete(SIGNALS_KEY)

      // Extract the include credentials flag, if present, from the signals value
      const appIncludedCredentials = signals.startsWith(APP_INCLUDED_CREDENTIALS_FLAG)
      const parsedSignals = appIncludedCredentials ? signals.substring(1) : signals
      console.debug('Found signals in headers:', parsedSignals)

      const isCrossOriginRequest = getCrossOriginValue(request) != null

      // Remove cookies when the app did not tell the browser to include them
      // but request instrumentation overrode that preference
      const removeCookies = !appIncludedCredentials && isCrossOriginRequest

      const cookie = request.headers.get('Cookie')
      if (removeCookies) {
        // The cookie would not have been sent without instrumentation so
        // don't forward the cookie to the origin
        requestHeaders.delete('Cookie')
      }

      const clientCookie = findClientCookie(cookie)

      return {
        clientCookie,
        signals: parsedSignals,
        removeCookies,
        originRequest: copyRequest({
          request,
          init: {
            headers: requestHeaders,
          },
        }),
      }
    }

    try {
      // Otherwise, try to find signals in the request body
      if (hasContentType(request.headers, 'application/x-www-form-urlencoded', 'multipart/form-data')) {
        const data = await request.clone().formData()
        const signals = data.get(SIGNALS_KEY)

        if (typeof signals === 'string') {
          console.debug('Found signals in request body:', signals)

          data.delete(SIGNALS_KEY)

          const requestHeaders = new Headers(request.headers)
          if (hasContentType(request.headers, 'multipart/form-data')) {
            // When modifying FormData for multipart/form-data, we also need to remove the old Content-Type header. Otherwise, the boundary will be different and the request will fail.
            // The new content type will be set automatically when constructing the new request.
            requestHeaders.delete('content-type')

            console.debug('Removed content-type header from request')
          }

          return {
            clientCookie: findClientCookie(request.headers.get('Cookie')),
            signals,
            removeCookies: false,
            originRequest: copyRequest({
              request,
              init: {
                body: data,
                headers: requestHeaders,
              },
            }),
          }
        }
      }
    } catch (error) {
      console.error('Error parsing incoming request:', error)
    }

    throw new SignalsNotAvailableError()
  }
}

function findClientCookie(cookie: string | null): string | undefined {
  if (cookie) {
    // Try to find _iidt cookie
    const iidtMatch = findCookie(cookie, '_iidt')
    if (iidtMatch) {
      console.debug('Found _iidt cookie', iidtMatch)
      return iidtMatch
    }
  }

  return undefined
}

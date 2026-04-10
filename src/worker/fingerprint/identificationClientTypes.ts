import { RuleAction } from './ruleset'
import { z } from 'zod/v4'

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

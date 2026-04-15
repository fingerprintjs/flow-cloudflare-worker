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

// https://docs.fingerprint.com/reference/server-api-v4-get-event#response-bot-info
const BotInfo = z
  .object({
    category: z.string(),
    provider: z.string(),
    provider_url: z.string().optional(),
    name: z.string(),
    identity: z.enum(['verified', 'signed', 'spoofed', 'unknown']),
    confidence: z.enum(['low', 'medium', 'high']),
  })
  .strict()

const GeolocationSubdivision = z
  .object({
    iso_code: z.string(),
    name: z.string(),
  })
  .strict()

/**
 * https://docs.fingerprint.com/reference/server-api-v4-get-event#response-ip-info-v4-geolocation
 * https://docs.fingerprint.com/reference/server-api-v4-get-event#response-ip-info-v6-geolocation
 * */
const Geolocation = z
  .object({
    accuracy_radius: z.int().min(0).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    postal_code: z.string().optional(),
    timezone: z.string().optional(),
    city_name: z.string().optional(),
    country_code: z.string().min(2).max(2).optional(),
    country_name: z.string().optional(),
    continent_code: z.string().min(2).max(2).optional(),
    continent_name: z.string().optional(),
    subdivisions: z.array(GeolocationSubdivision).optional(),
  })
  .strict()

// https://docs.fingerprint.com/reference/server-api-v4-get-event#response-ip-info-v4
const IpV4Info = z
  .object({
    address: z.ipv4(),
    geolocation: Geolocation.optional(),
    asn: z.string().optional(),
    asn_name: z.string().optional(),
    asn_network: z.string().optional(),
    asn_type: z.string().optional(),
    datacenter_result: z.boolean().optional(),
    datacenter_name: z.string().optional(),
  })
  .strict()

// https://docs.fingerprint.com/reference/server-api-v4-get-event#response-ip-info-v6
const IpV6Info = z
  .object({
    address: z.ipv6(),
    geolocation: Geolocation.optional(),
    asn: z.string().optional(),
    asn_name: z.string().optional(),
    asn_network: z.string().optional(),
    asn_type: z.string().optional(),
    datacenter_result: z.boolean().optional(),
    datacenter_name: z.string().optional(),
  })
  .strict()

// https://docs.fingerprint.com/reference/server-api-v4-get-event#response-ip-info
const IpInfo = z.object({
  v4: IpV4Info.optional(),
  v6: IpV6Info.optional(),
})

export const IdentificationEvent = z.object({
  replayed: z.boolean(),
  timestamp: z.coerce.date(),
  url: z.url(),
  ip_address: z.ipv4().or(z.ipv6()),
  ip_info: IpInfo,
  bot_info: BotInfo.optional(),
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
  // Agent data returned by the identification service
  agentData: string
  // Array of Set-Cookie header values to be sent to the client
  setCookieHeaders?: string[] | undefined
  // Optional rule action that was resolved by ingress
  ruleAction: RuleAction | undefined
  // Identification event received from ingress
  event: IdentificationEvent
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

const EdgeRequestHeader = z.object({
  name: z.string(),
  value: z.string(),
})

export const EdgeRequest = z.object({
  headers: z.array(EdgeRequestHeader).min(1),
  method: z.string(),
  url: z.url(),
  ipv4_address: z.ipv4().optional(),
  ipv6_address: z.ipv6().optional(),
  cf_properties: z.record(z.string(), z.unknown()).optional(),
})

export type EdgeRequest = z.infer<typeof EdgeRequest>

export const EdgeResponse = IdentificationEvent.pick({ ip_info: true, bot_info: true })
export type EdgeResponse = z.infer<typeof EdgeResponse>

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

const BotInfo = z
  .object({
    /** The type and purpose of the bot. */
    category: z.string(),
    /** The organization or company operating the bot. */
    provider: z.string(),
    /** The URL of the bot provider's website. */
    provider_url: z.string().optional(),
    /** The specific name or identifier of the bot. */
    name: z.string(),
    /**
     * The verification status of the bot's identity:
     * - `verified` - well-known bot with publicly verifiable identity, directed by the bot provider.
     * - `signed` - bot that signs its platform via Web Bot Auth, directed by the bot provider's customers.
     * - `spoofed` - bot that claims a public identity but fails verification.
     * - `unknown` - bot that does not publish a verifiable identity.
     */
    identity: z.enum(['verified', 'signed', 'spoofed', 'unknown']),
    /** Confidence level of the bot identification. */
    confidence: z.enum(['low', 'medium', 'high']),
  })
  .strict()

const GeolocationSubdivision = z
  .object({
    iso_code: z.string(),
    name: z.string(),
  })
  .strict()

const Geolocation = z
  .object({
    /** The IP address is likely to be within this radius (in km) of the specified location. */
    accuracy_radius: z.int().min(0).optional(),
    /** Latitude of the geolocation. */
    latitude: z.number().min(-90).max(90).optional(),
    /** Longitude of the geolocation. */
    longitude: z.number().min(-180).max(180).optional(),
    postal_code: z.string().optional(),
    /** Time zone of the geolocation. */
    timezone: z.string().optional(),
    /** City name of the geolocation. */
    city_name: z.string().optional(),
    /** ISO 3166-1 alpha-2 country code. */
    country_code: z.string().min(2).max(2).optional(),
    /** Country name of the geolocation. */
    country_name: z.string().optional(),
    /** Two-letter continent code. */
    continent_code: z.string().min(2).max(2).optional(),
    /** Continent name of the geolocation. */
    continent_name: z.string().optional(),
    subdivisions: z.array(GeolocationSubdivision).optional(),
  })
  .strict()

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

const IpInfo = z.object({
  v4: IpV4Info.optional(),
  v6: IpV6Info.optional(),
})

export const EdgeResponse = z.object({
  ip_info: IpInfo,
  bot_info: BotInfo.optional(),
})

export type EdgeResponse = z.infer<typeof EdgeResponse>

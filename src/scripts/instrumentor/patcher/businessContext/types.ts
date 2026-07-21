/**
 * Business context passed to the JS agent `collect()` call so tag / linkedId
 * are embedded in fingerprint_data before `/v4/send`.
 *
 * Matches On Demand Identification collect() options:
 * https://docs.fingerprint.com/docs/on-demand-identification#calling-the-collect-method
 */
export type BusinessContext = {
  /** Customer tag — simple value or object (not arrays), max 16KB per agent docs */
  tag?: unknown
  /** Customer linked id — string, max 256 chars per agent docs */
  linkedId?: string
}

/**
 * Partial values from a single source (body, headers, or window).
 * Fields may be absent when that source does not provide them.
 */
export type BusinessContextSource = {
  tag?: unknown
  linkedId?: string
}

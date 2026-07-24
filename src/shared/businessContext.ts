import { SIGNALS_KEY } from './const'

/** Body field names for business context (JSON / form fields). */
export const BODY_TAG_KEY = 'fp_tag'
export const BODY_LINKED_ID_KEY = 'fp_linked_id'

/** Request header names for business context. */
export const HEADER_TAG_KEY = 'fp-tag'
export const HEADER_LINKED_ID_KEY = 'fp-linked-id'

/** Window global names for business context. */
export const WINDOW_TAG_KEY = '__fp_tag'
export const WINDOW_LINKED_ID_KEY = '__fp_linked_id'

/**
 * Business context for Rules Engine (`tag` / `linked_id`).
 * Same shape whether sourced from window, headers, or body.
 */
export type BusinessContext = {
  /** Same semantics as JS agent / event tags */
  tag?: unknown
  /** Customer linked id */
  linkedId?: string
}

/**
 * Flow-owned request headers that instrumentation may inject.
 * Must be allowed/stripped in CORS preflight handling like `fp-data`.
 */
export const FLOW_OWNED_REQUEST_HEADERS = [SIGNALS_KEY, HEADER_TAG_KEY, HEADER_LINKED_ID_KEY] as const

/**
 * Max Content-Length for buffering a request body to extract business context on the
 * header-signals path. Larger (or chunked / unknown-length) bodies skip body extract
 * so protected API uploads keep streaming. Tag itself is capped at 16KB by agent docs.
 */
export const BUSINESS_CONTEXT_BODY_MAX_BYTES = 256 * 1024

/** Tag is absent when undefined, null, or empty string. */
export function presentTag(value: unknown): unknown | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value === 'string' && value === '') {
    return undefined
  }
  return value
}

/** linkedId must be a non-empty string. */
export function presentLinkedId(value: unknown): string | undefined {
  if (typeof value !== 'string' || value === '') {
    return undefined
  }
  return value
}

/** Returns undefined when both fields are absent after normalization. */
export function normalizeBusinessContext(context: BusinessContext): BusinessContext | undefined {
  const result: BusinessContext = {}
  const tag = presentTag(context.tag)
  if (tag !== undefined) {
    result.tag = tag
  }
  const linkedId = presentLinkedId(context.linkedId)
  if (linkedId !== undefined) {
    result.linkedId = linkedId
  }
  if (result.tag === undefined && result.linkedId === undefined) {
    return undefined
  }
  return result
}

/**
 * Header / form wire values are strings. Instrumentor always JSON-encodes tags so
 * numbers/booleans/objects round-trip with the same type as JSON body `fp_tag`.
 * Plain customer header/form strings that are not valid JSON stay strings.
 *
 * Note: a bare customer value that is itself valid JSON (e.g. form `fp_tag=123`)
 * will be parsed as that JSON type — same as always-JSON wire encoding. Prefer
 * quoted JSON strings (`"123"`) when a string scalar is required.
 */
export function parseTagTransportValue(value: string): unknown {
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed
  } catch {
    return value
  }
}

/** Serialize a tag for transport via HTTP header or form field (always JSON). */
export function serializeTagForTransport(tag: unknown): string {
  return JSON.stringify(tag)
}

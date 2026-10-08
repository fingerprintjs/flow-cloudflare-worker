import {
  BODY_LINKED_ID_KEY,
  BODY_TAG_KEY,
  BUSINESS_CONTEXT_BODY_MAX_BYTES,
  BusinessContext,
  HEADER_LINKED_ID_KEY,
  HEADER_TAG_KEY,
  normalizeBusinessContext,
  parseTagTransportValue,
  presentLinkedId,
  presentTag,
} from '../../shared/businessContext'
import { hasContentType } from '../utils/headers'

export type { BusinessContext }
export { normalizeBusinessContext }

/**
 * Merges business context from body and headers.
 * Precedence is per field, independently: body > headers, where an empty
 * body field (undefined / null / '') falls through to the header field.
 * (Window arrives as headers via instrumentor injection.)
 *
 * Returns undefined when neither field is present.
 */
export function resolveBusinessContext(sources: {
  body?: BusinessContext | undefined
  headers?: BusinessContext | undefined
}): BusinessContext | undefined {
  return normalizeBusinessContext({
    tag: presentTag(sources.body?.tag) ?? presentTag(sources.headers?.tag),
    linkedId: presentLinkedId(sources.body?.linkedId) ?? presentLinkedId(sources.headers?.linkedId),
  })
}

/**
 * Reads business context from request headers `fp-tag` and `fp-linked-id`.
 * Deletes those headers from `headers` when present (Flow-owned transport).
 */
export function extractAndStripBusinessContextFromHeaders(headers: Headers): BusinessContext {
  const result: BusinessContext = {}

  const rawTag = headers.get(HEADER_TAG_KEY)
  if (rawTag !== null) {
    const tag = presentTag(parseTagTransportValue(rawTag))
    if (tag !== undefined) {
      result.tag = tag
    }
  }
  headers.delete(HEADER_TAG_KEY)

  const rawLinkedId = headers.get(HEADER_LINKED_ID_KEY)
  if (rawLinkedId !== null) {
    const linkedId = presentLinkedId(rawLinkedId)
    if (linkedId !== undefined) {
      result.linkedId = linkedId
    }
  }
  headers.delete(HEADER_LINKED_ID_KEY)

  return result
}

type FormLike = FormData | URLSearchParams

/**
 * Reads and deletes `fp_tag` / `fp_linked_id` from form-urlencoded or multipart data.
 * Returns whether any Flow-owned fields were present (even if empty / absent after normalize).
 */
export function extractAndStripBusinessContextFromForm(data: FormLike): {
  context: BusinessContext
  didStrip: boolean
} {
  const result: BusinessContext = {}
  let didStrip = false

  if (data.has(BODY_TAG_KEY)) {
    didStrip = true
    const rawTag = data.get(BODY_TAG_KEY)
    data.delete(BODY_TAG_KEY)
    if (typeof rawTag === 'string') {
      const tag = presentTag(parseTagTransportValue(rawTag))
      if (tag !== undefined) {
        result.tag = tag
      }
    }
  }

  if (data.has(BODY_LINKED_ID_KEY)) {
    didStrip = true
    const rawLinkedId = data.get(BODY_LINKED_ID_KEY)
    data.delete(BODY_LINKED_ID_KEY)
    if (typeof rawLinkedId === 'string') {
      const linkedId = presentLinkedId(rawLinkedId)
      if (linkedId !== undefined) {
        result.linkedId = linkedId
      }
    }
  }

  return { context: result, didStrip }
}

type BodyBusinessContextExtract = {
  context: BusinessContext
  /** Rebuilt body when Flow-owned fields were stripped; undefined if body untouched */
  body?: BodyInit
  /** True when Content-Type must be cleared (multipart boundary rewrite) */
  clearContentType: boolean
}

/**
 * Optionally buffers and rewrites the body to extract/strip Flow-owned business context fields.
 *
 * Supports:
 * - application/x-www-form-urlencoded
 * - multipart/form-data
 * - application/json (top-level keys only)
 *
 * Skips when Content-Length is missing or above {@link BUSINESS_CONTEXT_BODY_MAX_BYTES}
 * so the header-signals hot path does not unconditionally buffer large/chunked uploads.
 * Also skips parse when a cheap substring check finds no Flow-owned field names.
 */
export async function tryExtractBusinessContextFromBody(
  request: Request
): Promise<BodyBusinessContextExtract | undefined> {
  if (!isBodyWithinBusinessContextBudget(request)) {
    return undefined
  }

  try {
    if (hasContentType(request.headers, 'application/x-www-form-urlencoded')) {
      const text = await request.clone().text()
      if (!bodyTextMentionsBusinessContext(text)) {
        return undefined
      }
      const data = new URLSearchParams(text)
      const { context, didStrip } = extractAndStripBusinessContextFromForm(data)
      if (!didStrip) {
        return undefined
      }
      return { context, body: data, clearContentType: false }
    }

    if (hasContentType(request.headers, 'multipart/form-data')) {
      // Cheap check on raw bytes before FormData parse (name="fp_tag" / name=fp_tag).
      const text = await request.clone().text()
      if (!bodyTextMentionsBusinessContext(text)) {
        return undefined
      }
      // Re-clone for FormData — prior text() consumed the clone, not the original.
      const data = await request.clone().formData()
      const { context, didStrip } = extractAndStripBusinessContextFromForm(data)
      if (!didStrip) {
        return undefined
      }
      return { context, body: data, clearContentType: true }
    }

    if (hasContentType(request.headers, 'application/json')) {
      const text = await request.clone().text()
      if (!bodyTextMentionsBusinessContext(text)) {
        return undefined
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        return undefined
      }

      const stripped = extractAndStripBusinessContextFromJsonObject(parsed)
      if (!stripped) {
        return undefined
      }

      return {
        context: stripped.context,
        body: JSON.stringify(stripped.body),
        clearContentType: false,
      }
    }
  } catch (error) {
    console.error('Error extracting business context from body:', error)
  }

  return undefined
}

/**
 * Top-level-only JSON body extract + strip for `fp_tag` / `fp_linked_id`.
 *
 * SPIKE note: intentionally limited — no deep paths, no streaming tee.
 * Arrays / non-objects as root are skipped.
 */
function extractAndStripBusinessContextFromJsonObject(value: unknown):
  | {
      context: BusinessContext
      body: Record<string, unknown>
    }
  | undefined {
  if (!isPlainObject(value)) {
    return undefined
  }

  const result: BusinessContext = {}
  let didStrip = false
  const body: Record<string, unknown> = { ...value }

  if (Object.prototype.hasOwnProperty.call(body, BODY_TAG_KEY)) {
    didStrip = true
    const tag = presentTag(body[BODY_TAG_KEY])
    delete body[BODY_TAG_KEY]
    if (tag !== undefined) {
      result.tag = tag
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, BODY_LINKED_ID_KEY)) {
    didStrip = true
    const linkedId = presentLinkedId(body[BODY_LINKED_ID_KEY])
    delete body[BODY_LINKED_ID_KEY]
    if (linkedId !== undefined) {
      result.linkedId = linkedId
    }
  }

  if (!didStrip) {
    return undefined
  }

  return { context: result, body }
}

/**
 * Require a known Content-Length within budget before cloning the body.
 * Chunked / missing length → skip (preserve streaming for uploads).
 */
function isBodyWithinBusinessContextBudget(request: Request): boolean {
  const contentLength = request.headers.get('Content-Length')
  if (contentLength === null) {
    return false
  }

  const length = Number(contentLength)
  if (!Number.isFinite(length) || length < 0 || length > BUSINESS_CONTEXT_BODY_MAX_BYTES) {
    return false
  }

  return true
}

function bodyTextMentionsBusinessContext(text: string): boolean {
  return text.includes(BODY_TAG_KEY) || text.includes(BODY_LINKED_ID_KEY)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

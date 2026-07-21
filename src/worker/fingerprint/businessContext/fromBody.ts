import { BODY_LINKED_ID_KEY, BODY_TAG_KEY, BUSINESS_CONTEXT_BODY_MAX_BYTES } from '../../../shared/businessContext'
import { hasContentType } from '../../utils/headers'
import { BusinessContextSource } from './types'
import { extractAndStripBusinessContextFromForm } from './fromForm'
import { extractAndStripBusinessContextFromJsonObject } from './fromJson'

export type BodyBusinessContextExtract = {
  context: BusinessContextSource
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
 * Require a known Content-Length within budget before cloning the body.
 * Chunked / missing length → skip (preserve streaming for uploads).
 */
export function isBodyWithinBusinessContextBudget(request: Request): boolean {
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

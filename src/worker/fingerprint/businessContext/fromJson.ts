import { BODY_LINKED_ID_KEY, BODY_TAG_KEY } from '../../../shared/businessContext'
import { BusinessContextSource } from './types'

/**
 * Top-level-only JSON body extract + strip for `fp_tag` / `fp_linked_id`.
 *
 * SPIKE note: intentionally limited — no deep paths, no streaming tee.
 * Arrays / non-objects as root are skipped.
 */
export function extractAndStripBusinessContextFromJsonObject(value: unknown):
  | {
      context: BusinessContextSource
      body: Record<string, unknown>
      didStrip: boolean
    }
  | undefined {
  if (!isPlainObject(value)) {
    return undefined
  }

  const result: BusinessContextSource = {}
  let didStrip = false
  const body: Record<string, unknown> = { ...value }

  if (Object.prototype.hasOwnProperty.call(body, BODY_TAG_KEY)) {
    didStrip = true
    const tag = body[BODY_TAG_KEY]
    delete body[BODY_TAG_KEY]
    if (tag !== undefined && tag !== null && tag !== '') {
      result.tag = tag
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, BODY_LINKED_ID_KEY)) {
    didStrip = true
    const linkedId = body[BODY_LINKED_ID_KEY]
    delete body[BODY_LINKED_ID_KEY]
    if (typeof linkedId === 'string' && linkedId !== '') {
      result.linkedId = linkedId
    }
  }

  if (!didStrip) {
    return undefined
  }

  return { context: result, body, didStrip }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

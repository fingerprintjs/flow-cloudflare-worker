import { BODY_LINKED_ID_KEY, BODY_TAG_KEY, parseTagTransportValue } from '../../../shared/businessContext'
import { BusinessContextSource } from './types'

type FormLike = FormData | URLSearchParams

/**
 * Reads and deletes `fp_tag` / `fp_linked_id` from form-urlencoded or multipart data.
 * Returns whether any Flow-owned fields were present (even if empty / absent after normalize).
 */
export function extractAndStripBusinessContextFromForm(data: FormLike): {
  context: BusinessContextSource
  didStrip: boolean
} {
  const result: BusinessContextSource = {}
  let didStrip = false

  if (data.has(BODY_TAG_KEY)) {
    didStrip = true
    const tag = data.get(BODY_TAG_KEY)
    data.delete(BODY_TAG_KEY)
    if (typeof tag === 'string' && tag !== '') {
      result.tag = parseTagTransportValue(tag)
    }
  }

  if (data.has(BODY_LINKED_ID_KEY)) {
    didStrip = true
    const linkedId = data.get(BODY_LINKED_ID_KEY)
    data.delete(BODY_LINKED_ID_KEY)
    if (typeof linkedId === 'string' && linkedId !== '') {
      result.linkedId = linkedId
    }
  }

  return { context: result, didStrip }
}

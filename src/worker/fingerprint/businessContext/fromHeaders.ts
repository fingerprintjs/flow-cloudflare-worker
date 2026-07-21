import { HEADER_LINKED_ID_KEY, HEADER_TAG_KEY, parseTagTransportValue } from '../../../shared/businessContext'
import { BusinessContextSource } from './types'

/**
 * Reads business context from request headers `fp-tag` and `fp-linked-id`.
 * Deletes those headers from `headers` when present (Flow-owned transport).
 */
export function extractAndStripBusinessContextFromHeaders(headers: Headers): BusinessContextSource {
  const result: BusinessContextSource = {}

  const tag = headers.get(HEADER_TAG_KEY)
  if (tag !== null && tag !== '') {
    result.tag = parseTagTransportValue(tag)
  }
  headers.delete(HEADER_TAG_KEY)

  const linkedId = headers.get(HEADER_LINKED_ID_KEY)
  if (linkedId !== null && linkedId !== '') {
    result.linkedId = linkedId
  }
  headers.delete(HEADER_LINKED_ID_KEY)

  return result
}

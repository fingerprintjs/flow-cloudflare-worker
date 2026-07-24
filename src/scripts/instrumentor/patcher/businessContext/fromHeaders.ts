import { HEADER_LINKED_ID_KEY, HEADER_TAG_KEY } from './const'
import { BusinessContext } from '../../../shared/fingerprint/types'

/**
 * Reads business context from request headers `fp-tag` and `fp-linked-id`.
 */
export function extractBusinessContextFromHeaders(headers: Headers): BusinessContext {
  const result: BusinessContext = {}

  const tag = headers.get(HEADER_TAG_KEY)
  if (tag !== null && tag !== '') {
    result.tag = tag
  }

  const linkedId = headers.get(HEADER_LINKED_ID_KEY)
  if (linkedId !== null && linkedId !== '') {
    result.linkedId = linkedId
  }

  return result
}

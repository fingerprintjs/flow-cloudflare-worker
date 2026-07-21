import { HEADER_LINKED_ID_KEY, HEADER_TAG_KEY } from './const'
import { BusinessContextSource } from './types'

/**
 * Reads business context from request headers `fp-tag` and `fp-linked-id`.
 */
export function extractBusinessContextFromHeaders(
  headers: Headers | Record<string, string> | Map<string, string> | undefined
): BusinessContextSource {
  if (!headers) {
    return {}
  }

  const result: BusinessContextSource = {}

  const tag = getHeader(headers, HEADER_TAG_KEY)
  if (tag !== undefined && tag !== '') {
    result.tag = tag
  }

  const linkedId = getHeader(headers, HEADER_LINKED_ID_KEY)
  if (linkedId !== undefined && linkedId !== '') {
    result.linkedId = linkedId
  }

  return result
}

function getHeader(
  headers: Headers | Record<string, string> | Map<string, string>,
  name: string
): string | undefined {
  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined
  }

  if (headers instanceof Map) {
    // XHR recorder stores lowercased names
    return headers.get(name.toLowerCase()) ?? headers.get(name) ?? undefined
  }

  const direct = headers[name] ?? headers[name.toLowerCase()]
  if (direct !== undefined) {
    return direct
  }

  // Case-insensitive lookup for plain objects
  const lowerName = name.toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName) {
      return value
    }
  }

  return undefined
}

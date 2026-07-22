import { HEADER_LINKED_ID_KEY, HEADER_TAG_KEY, serializeTagForTransport } from '../../../../shared/businessContext'
import { PatcherRequest } from '../types'
import { extractBusinessContextFromWindow } from './fromWindow'

/**
 * Injects window `__fp_tag` / `__fp_linked_id` as `fp-tag` / `fp-linked-id` headers
 * only when those headers are not already set (customer headers win).
 *
 * Does not call collect() — worker maps headers onto SendBody.
 */
export function injectWindowBusinessContextAsHeaders(
  request: PatcherRequest,
  existingHeaders: Headers | Map<string, string> | undefined
): void {
  const windowContext = extractBusinessContextFromWindow()

  if (windowContext.tag !== undefined && !hasHeader(existingHeaders, HEADER_TAG_KEY)) {
    request.setHeader(HEADER_TAG_KEY, serializeTagForTransport(windowContext.tag))
  }

  if (windowContext.linkedId !== undefined && !hasHeader(existingHeaders, HEADER_LINKED_ID_KEY)) {
    request.setHeader(HEADER_LINKED_ID_KEY, windowContext.linkedId)
  }
}

function hasHeader(headers: Headers | Map<string, string> | undefined, name: string): boolean {
  if (!headers) {
    return false
  }

  const value = headers instanceof Headers ? headers.get(name) : (headers.get(name.toLowerCase()) ?? headers.get(name))
  return value !== undefined && value !== null && value !== ''
}

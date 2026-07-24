import {
  BODY_LINKED_ID_KEY,
  BODY_TAG_KEY,
  BusinessContext,
  HEADER_LINKED_ID_KEY,
  HEADER_TAG_KEY,
  presentLinkedId,
  presentTag,
  serializeTagForTransport,
  WINDOW_LINKED_ID_KEY,
  WINDOW_TAG_KEY,
} from '../../../shared/businessContext'
import { PatcherRequest } from './types'

/**
 * Reads business context from window globals `__fp_tag` and `__fp_linked_id`.
 * Only own properties are read (not prototype-chain values).
 */
export function extractBusinessContextFromWindow(target: object = globalThis): BusinessContext {
  const result: BusinessContext = {}

  if (Object.prototype.hasOwnProperty.call(target, WINDOW_TAG_KEY)) {
    const tag = presentTag(Reflect.get(target, WINDOW_TAG_KEY))
    if (tag !== undefined) {
      result.tag = tag
    }
  }

  if (Object.prototype.hasOwnProperty.call(target, WINDOW_LINKED_ID_KEY)) {
    const linkedId = presentLinkedId(Reflect.get(target, WINDOW_LINKED_ID_KEY))
    if (linkedId !== undefined) {
      result.linkedId = linkedId
    }
  }

  return result
}

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

/**
 * Injects window business context as hidden form fields when those fields are not
 * already present (customer body fields win). Native form submit cannot set headers.
 */
export function injectWindowBusinessContextAsFormFields(form: HTMLFormElement): void {
  const windowContext = extractBusinessContextFromWindow()

  if (windowContext.tag !== undefined && !form.querySelector(`[name="${BODY_TAG_KEY}"]`)) {
    form.appendChild(createHiddenField(BODY_TAG_KEY, serializeTagForTransport(windowContext.tag)))
  }

  if (windowContext.linkedId !== undefined && !form.querySelector(`[name="${BODY_LINKED_ID_KEY}"]`)) {
    form.appendChild(createHiddenField(BODY_LINKED_ID_KEY, windowContext.linkedId))
  }
}

function hasHeader(headers: Headers | Map<string, string> | undefined, name: string): boolean {
  if (!headers) {
    return false
  }

  const value = headers instanceof Headers ? headers.get(name) : (headers.get(name.toLowerCase()) ?? headers.get(name))
  return value !== undefined && value !== null && value !== ''
}

function createHiddenField(name: string, value: string): HTMLInputElement {
  const field = document.createElement('input')
  field.hidden = true
  field.name = name
  field.value = value
  return field
}

import { WINDOW_LINKED_ID_KEY, WINDOW_TAG_KEY } from '../../../../shared/businessContext'

export type WindowBusinessContext = {
  tag?: unknown
  linkedId?: string
}

/**
 * Reads business context from window globals `__fp_tag` and `__fp_linked_id`.
 * Treats null / empty string as absent.
 * Only own properties are read (not prototype-chain values).
 */
export function extractBusinessContextFromWindow(target: object = globalThis): WindowBusinessContext {
  const result: WindowBusinessContext = {}

  if (Object.prototype.hasOwnProperty.call(target, WINDOW_TAG_KEY)) {
    const tag = Reflect.get(target, WINDOW_TAG_KEY)
    if (tag !== undefined && tag !== null && tag !== '') {
      result.tag = tag
    }
  }

  if (Object.prototype.hasOwnProperty.call(target, WINDOW_LINKED_ID_KEY)) {
    const linkedId = Reflect.get(target, WINDOW_LINKED_ID_KEY)
    if (typeof linkedId === 'string' && linkedId !== '') {
      result.linkedId = linkedId
    }
  }

  return result
}

import { WINDOW_LINKED_ID_KEY, WINDOW_TAG_KEY } from './const'
import { BusinessContextSource } from './types'

/**
 * Reads business context from window globals `__fp_tag` and `__fp_linked_id`.
 */
export function extractBusinessContextFromWindow(target: object = globalThis): BusinessContextSource {
  const result: BusinessContextSource = {}

  if (Object.prototype.hasOwnProperty.call(target, WINDOW_TAG_KEY)) {
    const tag = Reflect.get(target, WINDOW_TAG_KEY)
    if (tag !== undefined && tag !== null && tag !== '') {
      result.tag = tag
    }
  }

  const linkedId = Reflect.get(target, WINDOW_LINKED_ID_KEY)
  if (typeof linkedId === 'string' && linkedId !== '') {
    result.linkedId = linkedId
  }

  return result
}

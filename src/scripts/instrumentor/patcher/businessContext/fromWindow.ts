import { WINDOW_LINKED_ID_KEY, WINDOW_TAG_KEY } from './const'
import { BusinessContext } from '../../../shared/fingerprint/types'

/**
 * Reads business context from window globals `__fp_tag` and `__fp_linked_id`.
 */
export function extractBusinessContextFromWindow(target: object = globalThis): BusinessContext {
  const result: BusinessContext = {}

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

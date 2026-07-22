import { BusinessContext, BusinessContextSource } from './types'

/**
 * Merges business context from body and headers.
 * Precedence is per field, independently: body > headers, where an empty
 * body field (undefined / null / '') falls through to the header field.
 * (Window arrives as headers via instrumentor injection.)
 *
 * Returns undefined when neither field is present.
 */
export function resolveBusinessContext(sources: {
  body?: BusinessContextSource | undefined
  headers?: BusinessContextSource | undefined
}): BusinessContext | undefined {
  return normalizeBusinessContext({
    tag: presentTag(sources.body?.tag) ?? presentTag(sources.headers?.tag),
    linkedId: presentLinkedId(sources.body?.linkedId) ?? presentLinkedId(sources.headers?.linkedId),
  })
}

/** Returns undefined when both fields are absent after normalization. */
export function normalizeBusinessContext(context: BusinessContext): BusinessContext | undefined {
  const result: BusinessContext = {}
  const tag = presentTag(context.tag)
  if (tag !== undefined) {
    result.tag = tag
  }
  const linkedId = presentLinkedId(context.linkedId)
  if (linkedId !== undefined) {
    result.linkedId = linkedId
  }
  if (result.tag === undefined && result.linkedId === undefined) {
    return undefined
  }
  return result
}

/** Tag is absent when undefined, null, or empty string. */
function presentTag(value: unknown): unknown | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value === 'string' && value === '') {
    return undefined
  }
  return value
}

/** linkedId must be a non-empty string. */
function presentLinkedId(value: unknown): string | undefined {
  if (typeof value !== 'string' || value === '') {
    return undefined
  }
  return value
}

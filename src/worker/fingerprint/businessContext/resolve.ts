import { BusinessContext, BusinessContextSource } from './types'

/**
 * Merges business context from body and headers.
 * Precedence is per field, independently: body > headers.
 * (Window arrives as headers via instrumentor injection.)
 */
export function resolveBusinessContext(sources: {
  body?: BusinessContextSource | undefined
  headers?: BusinessContextSource | undefined
}): BusinessContext {
  const result: BusinessContext = {}

  const tag = firstPresent(sources.body?.tag, sources.headers?.tag)
  if (tag !== undefined) {
    result.tag = tag
  }

  const linkedId = firstPresentLinkedId(sources.body?.linkedId, sources.headers?.linkedId)
  if (linkedId !== undefined) {
    result.linkedId = linkedId
  }

  return result
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

function firstPresent(...values: Array<unknown>): unknown | undefined {
  for (const value of values) {
    const present = presentTag(value)
    if (present !== undefined) {
      return present
    }
  }
  return undefined
}

function firstPresentLinkedId(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const present = presentLinkedId(value)
    if (present !== undefined) {
      return present
    }
  }
  return undefined
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

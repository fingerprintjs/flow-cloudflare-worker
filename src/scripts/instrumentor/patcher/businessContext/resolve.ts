import { BusinessContext } from '../../../shared/fingerprint/types'

/**
 * Merges business context from body, headers, and window.
 *
 * Precedence is per field, independently: body > headers > window.
 * Mixing sources is intentional (e.g. tag from body + linkedId from window).
 */
export function resolveBusinessContext(sources: {
  body?: BusinessContext
  headers?: BusinessContext
  window?: BusinessContext
}): BusinessContext | undefined {
  const result: BusinessContext = {}

  const tag = firstPresent(sources.body?.tag, sources.headers?.tag, sources.window?.tag)
  if (tag !== undefined) {
    result.tag = tag
  }

  const linkedId = firstPresentLinkedId(
    sources.body?.linkedId,
    sources.headers?.linkedId,
    sources.window?.linkedId
  )
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

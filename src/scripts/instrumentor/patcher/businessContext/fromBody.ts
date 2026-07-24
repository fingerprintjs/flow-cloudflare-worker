import { BODY_LINKED_ID_KEY, BODY_TAG_KEY } from './const'
import { BusinessContext } from '../../../shared/fingerprint/types'
import { logger } from '../../../shared/logger'

/**
 * Extracts business context from an explicitly supported request body.
 * Strings require a JSON or form-urlencoded content type.
 */
export function extractBusinessContextFromBody(
  body: BodyInit | Document | null | undefined,
  contentType?: string | null
): BusinessContext {
  if (body == null) {
    return {}
  }

  if (body instanceof URLSearchParams || body instanceof FormData) {
    return fromFormLike(body)
  }

  return typeof body === 'string' ? parseStringBody(body, contentType) : {}
}

/**
 * Extracts business context from an HTML form's named fields.
 */
export function extractBusinessContextFromForm(form: HTMLFormElement): BusinessContext {
  const data = new FormData(form)
  return fromFormLike(data)
}

/**
 * Extracts business context from a fetch `Request` by cloning so the original body stays usable.
 */
export async function extractBusinessContextFromRequest(request: Request): Promise<BusinessContext> {
  if (!request.body || request.bodyUsed) {
    return {}
  }

  try {
    const contentType = request.headers.get('content-type')
    const clone = request.clone()

    if (contentTypeIncludes(contentType, 'application/json')) {
      const json: unknown = await clone.json()
      return fromJsonValue(json)
    }

    if (
      contentTypeIncludes(contentType, 'application/x-www-form-urlencoded') ||
      contentTypeIncludes(contentType, 'multipart/form-data')
    ) {
      return fromFormLike(await clone.formData())
    }

    return {}
  } catch (error) {
    logger.warn('Failed to extract business context from Request body:', error)
    return {}
  }
}

function fromFormLike(data: URLSearchParams | FormData): BusinessContext {
  const result: BusinessContext = {}

  const tag = data.get(BODY_TAG_KEY)
  if (typeof tag === 'string' && tag !== '') {
    result.tag = tag
  }

  const linkedId = data.get(BODY_LINKED_ID_KEY)
  if (typeof linkedId === 'string' && linkedId !== '') {
    result.linkedId = linkedId
  }

  return result
}

function parseStringBody(body: string, contentType?: string | null): BusinessContext {
  if (!body) {
    return {}
  }

  if (contentTypeIncludes(contentType, 'application/json')) {
    try {
      return fromJsonValue(JSON.parse(body))
    } catch {
      return {}
    }
  }

  if (contentTypeIncludes(contentType, 'application/x-www-form-urlencoded')) {
    return fromFormLike(new URLSearchParams(body))
  }

  return {}
}

function fromJsonValue(value: unknown): BusinessContext {
  if (!isRecord(value)) {
    return {}
  }

  const result: BusinessContext = {}

  if (BODY_TAG_KEY in value) {
    const tag = value[BODY_TAG_KEY]
    if (tag !== undefined && tag !== null && tag !== '') {
      result.tag = tag
    }
  }

  const linkedId = value[BODY_LINKED_ID_KEY]
  if (typeof linkedId === 'string' && linkedId !== '') {
    result.linkedId = linkedId
  }

  return result
}

function contentTypeIncludes(contentType: string | null | undefined, expected: string): boolean {
  return contentType?.toLowerCase().includes(expected) ?? false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

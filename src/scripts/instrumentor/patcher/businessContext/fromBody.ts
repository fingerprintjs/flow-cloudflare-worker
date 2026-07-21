import { BODY_LINKED_ID_KEY, BODY_TAG_KEY } from './const'
import { BusinessContextSource } from './types'
import { logger } from '../../../shared/logger'

/**
 * Extracts business context from a request body without consuming stream bodies.
 *
 * Supports: string, URLSearchParams, FormData, Blob, ArrayBuffer / TypedArray.
 * Skips ReadableStream (would require tee; left for a later phase).
 */
export async function extractBusinessContextFromBody(
  body: BodyInit | Document | null | undefined,
  contentType?: string | null
): Promise<BusinessContextSource> {
  if (body == null) {
    return {}
  }

  try {
    if (typeof body === 'string') {
      return parseStringBody(body, contentType)
    }

    if (body instanceof URLSearchParams || body instanceof FormData) {
      return fromFormLike(body)
    }

    if (typeof Document !== 'undefined' && body instanceof Document) {
      return {}
    }

    if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
      logger.debug('Skipping business context extraction from ReadableStream body')
      return {}
    }

    if (body instanceof Blob) {
      const blobType = contentType ?? body.type
      if (blobType && !isParsableContentType(blobType)) {
        return {}
      }
      return parseStringBody(await body.text(), blobType)
    }

    if (body instanceof ArrayBuffer) {
      if (contentType && !isParsableContentType(contentType)) {
        return {}
      }
      return parseStringBody(new TextDecoder().decode(body), contentType)
    }

    if (ArrayBuffer.isView(body)) {
      if (contentType && !isParsableContentType(contentType)) {
        return {}
      }
      return parseStringBody(new TextDecoder().decode(body), contentType)
    }
  } catch (error) {
    logger.warn('Failed to extract business context from body:', error)
  }

  return {}
}

/**
 * Extracts business context from an HTML form's named fields.
 */
export function extractBusinessContextFromForm(form: HTMLFormElement): BusinessContextSource {
  const data = new FormData(form)
  return fromFormLike(data)
}

/**
 * Extracts business context from a fetch `Request` by cloning so the original body stays usable.
 */
export async function extractBusinessContextFromRequest(request: Request): Promise<BusinessContextSource> {
  if (!request.body || request.bodyUsed) {
    return {}
  }

  try {
    const clone = request.clone()
    const contentType = request.headers.get('content-type')

    if (contentType && !isParsableContentType(contentType)) {
      return {}
    }

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

    return parseStringBody(await clone.text(), contentType)
  } catch (error) {
    logger.warn('Failed to extract business context from Request body:', error)
    return {}
  }
}

function fromFormLike(data: URLSearchParams | FormData): BusinessContextSource {
  const result: BusinessContextSource = {}

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

function parseStringBody(body: string, contentType?: string | null): BusinessContextSource {
  if (!body) {
    return {}
  }

  const isJson = contentTypeIncludes(contentType, 'application/json')
  const isFormUrlEncoded = contentTypeIncludes(contentType, 'application/x-www-form-urlencoded')

  if (isJson || (!contentType && looksLikeJsonObject(body))) {
    try {
      return fromJsonValue(JSON.parse(body))
    } catch {
      // fall through
    }
  }

  if (isFormUrlEncoded || (!contentType && looksLikeFormUrlEncoded(body))) {
    try {
      return fromFormLike(new URLSearchParams(body))
    } catch {
      // fall through
    }
  }

  return {}
}

function fromJsonValue(value: unknown): BusinessContextSource {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const record = value as Record<string, unknown>
  const result: BusinessContextSource = {}

  if (BODY_TAG_KEY in record) {
    const tag = record[BODY_TAG_KEY]
    if (tag !== undefined && tag !== null && tag !== '') {
      result.tag = tag
    }
  }

  const linkedId = record[BODY_LINKED_ID_KEY]
  if (typeof linkedId === 'string' && linkedId !== '') {
    result.linkedId = linkedId
  }

  return result
}

function contentTypeIncludes(contentType: string | null | undefined, expected: string): boolean {
  return contentType?.toLowerCase().includes(expected) ?? false
}

function isParsableContentType(contentType: string): boolean {
  return (
    contentTypeIncludes(contentType, 'application/json') ||
    contentTypeIncludes(contentType, 'application/x-www-form-urlencoded') ||
    contentTypeIncludes(contentType, 'multipart/form-data') ||
    contentTypeIncludes(contentType, 'text/')
  )
}

function looksLikeJsonObject(body: string): boolean {
  const trimmed = body.trim()
  return trimmed.startsWith('{') && trimmed.endsWith('}')
}

function looksLikeFormUrlEncoded(body: string): boolean {
  return body.includes('=') && !looksLikeJsonObject(body)
}

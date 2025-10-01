import { HeaderMissingError } from '../errors'

export function hasContentType(headers: Headers, expectedContentType: string) {
  const contentType = headers.get('Content-Type')?.toLowerCase()

  if (contentType) {
    return contentType.startsWith(expectedContentType)
  }

  return false
}

export function getHeaderOrThrow(headers: Headers, name: string) {
  const value = headers.get(name)
  if (!value) {
    throw new HeaderMissingError(name)
  }
  return value
}

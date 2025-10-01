export function hasContentType(headers: Headers, expectedContentType: string) {
  const contentType = headers.get('Content-Type')?.toLowerCase()

  if (contentType) {
    return contentType.startsWith(expectedContentType)
  }

  return false
}

export function hasContentType(headers: Headers, contentType: string) {
  return headers.get('Content-Type')?.includes(contentType)
}

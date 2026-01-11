import { HeaderMissingError } from '../errors'

export function hasContentType(headers: Headers, ...expectedContentTypes: string[]) {
  const contentType = headers.get('Content-Type')?.toLowerCase()

  if (contentType) {
    return expectedContentTypes.some((expectedContentType) => contentType.startsWith(expectedContentType))
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

let localIp: string | undefined
export async function getIp(headers: Headers): Promise<string> {
  const ip = headers.get('cf-connecting-ip')

  if (ip) {
    return ip
  }

  if (import.meta.env.MODE == 'dev') {
    console.debug('Fetching local IP for dev mode')
    if (localIp === undefined) {
      const ipResponse = await fetch('https://checkip.amazonaws.com/')
      const ip = await ipResponse.text()
      localIp = ip.trim()
    }
    return localIp
  }

  throw new HeaderMissingError('cf-connecting-ip')
}

export function isDocumentDestination(headers: Headers) {
  return headers.get('Sec-Fetch-Dest')?.includes('document')
}

/**
 * Remove a header value from an HTTP header value that uses comma-separated lists to
 * separated individual values.
 *
 * @param headers the `Headers` to update
 * @param name the name of the header field to update
 * @param value the value to remove from the header field
 */
export function removeHeaderValue(headers: Headers, name: string, value: string) {
  const headerValue = headers.get(name)
  if (headerValue) {
    const headerValues = headerValue.split(',').map((s) => s.trim())

    const valueIndex = headerValues.findIndex((v) => v.toLowerCase() === value.toLowerCase())
    if (valueIndex !== -1) {
      // Only modify the header field when the value is present
      headerValues.splice(valueIndex, 1)
      if (headerValues.length === 0) {
        headers.delete(name)
      } else {
        headers.set(name, headerValues.join(','))
      }
    }
  }
}

/**
 * Append a value to the HTTP header, only if that value is not already in the value
 * for the header
 *
 * @param headers the `Headers` to update
 * @param name the name of the header field to update
 * @param value the value to add to the header field, if it is not already present
 */
export function appendHeaderValue(headers: Headers, name: string, value: string) {
  const headerValue = headers.get(name)
  if (headerValue) {
    const headerValues = headerValue.split(',').map((s) => s.trim())
    const valueIndex = headerValues.findIndex((v) => v.toLowerCase() === value.toLowerCase())
    if (valueIndex === -1) {
      // Only modify the header field when the value is already present
      headerValues.push(value)
      headers.set(name, headerValues.join(','))
    }
  } else {
    headers.set(name, value)
  }
}

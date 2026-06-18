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
 * If `value` is truthy, sets the header field to the value in the passed headers.
 * If `value` is falsy, removes the header field from the headers.
 *
 * @param headers the `Headers` to update
 * @param name the name of the header field
 * @param value the value of the header field or a falsy value if the header should not be set
 */
export function setOrRemoveHeaderField(headers: Headers, name: string, value?: string) {
  if (value) {
    headers.set(name, value)
  } else {
    headers.delete(name)
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

/**
 * Merges multiple Headers objects into a new Headers object.
 *
 * @param {Headers} headers - The base Headers object to start with.
 * @param {...Headers} otherHeaders - Additional Headers objects to merge into the base Headers.
 * @return {Headers} A new Headers object containing the merged headers.
 */
export function mergeHeaders(headers: Headers, ...otherHeaders: Headers[]): Headers {
  const result = new Headers(headers)

  for (const otherHeader of otherHeaders) {
    for (const [key, value] of otherHeader.entries()) {
      result.set(key, value)
    }
  }

  return result
}
/**
 * Encode a value as an RFC 8941 structured-field string: surrounded by double quotes, with `\` and
 * `"` backslash-escaped. Consumers must unquote and unescape to recover the original value.
 */
export function sfString(value: string): string {
  // The common case will be that no escaping is required so optimize for that
  if (!/[\\"]/.test(value)) {
    return `"${value}"`;
  }
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Encode a unix-seconds timestamp as an RFC 9651 structured-field date: `@<seconds>`.
 */
export function sfDate(date: Date): string {
  return `@${Math.trunc(date.getTime() / 1000)}`
}

// Represents `true` boolean value per RFC 8941
export const sfBoolTrue = '?1'

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
 * If `value` is truthy, sets the header field to `serializer(value)` in the passed headers.
 * If `value` is falsy, removes the header field from the headers.
 *
 * @param headers the `Headers` to update
 * @param name the name of the header field
 * @param serializer if the value is truthy, the function that will serialize the value to be set in the header
 * @param value the value of the header field or a falsy value if the header should not be set
 */
export function setOrRemoveHeaderField<T>(
  headers: Headers,
  name: string,
  serializer: (input: T) => string,
  value: T | undefined
) {
  if (value) {
    headers.set(name, serializer(value))
  } else {
    headers.delete(name)
  }
}

/**
 * Serializer for `setOrRemoveHeaderField` that turns a number into an RFC 9651 sf-string.
 */
export function sfStringFromNumber(value: number): string {
  return sfString(String(value))
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
 * Encode a value as an RFC 9651 structured-field string: surrounded by double quotes, with `\` and
 * `"` backslash-escaped. Consumers must unquote and unescape to recover the original value.
 */
export function sfString(value: string): string {
  // The common case will be that no escaping is required so optimize for that
  if (!/[\\"]/.test(value)) {
    return `"${value}"`
  }
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Encode a value as an RFC 9651 structured-field Display String: `%"<utf8-percent-encoded>"`. Use
 * this instead of `sfString` when the value may contain non-ASCII characters (sf-string is
 * restricted to printable ASCII). Bytes that are `%`, `"`, control characters, DEL, or non-ASCII
 * are percent-encoded as lowercase `%xx`.
 */
export function sfDisplayString(value: string): string {
  const utf8 = new TextEncoder().encode(value)
  let out = '%"'
  for (const byte of utf8) {
    // unescaped per RFC 9651: %x20-21 / %x23-24 / %x26-7E (i.e. printable ASCII except `"` and `%`)
    // - `byte < 0x20` matches all ASCII control characters (0x00..0x1F: NUL, tab, newline, …)
    // - `byte > 0x7e` matches DEL (0x7F) and every non-ASCII byte (0x80..0xFF), which in UTF-8
    //   are the continuation/high bytes of multibyte characters (e.g. `ü` → 0xC3 0xBC)
    if (byte === 0x22 /* " */ || byte === 0x25 /* % */ || byte < 0x20 || byte > 0x7e) {
      out += '%' + byte.toString(16).padStart(2, '0')
    } else {
      out += String.fromCharCode(byte)
    }
  }
  return out + '"'
}

/**
 * Encode a unix-milliseconds timestamp as an RFC 9651 structured-field date: `@<seconds>
 */
export function sfDate(timestamp: number): string {
  return `@${Math.trunc(timestamp / 1000)}`
}

// Represents `true` boolean value per RFC 9651
export const sfBoolTrue = '?1'

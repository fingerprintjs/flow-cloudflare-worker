/**
 * @fileoverview
 *
 * Implements utility functions for working with cookies.
 * Based on "cookie" library: https://github.com/jshttp/cookie
 * */

/**
 * Represents a cookie with a name and value.
 */
class Cookie {
  constructor(
    public readonly name: string,
    public readonly value: string
  ) {}

  /**
   * Converts the cookie's name and value into a string formatted as a valid cookie.
   *
   * @return {string} A string representation of the cookie in "name=value" format.
   */
  toCookieString(): string {
    return `${this.name}=${this.value}`
  }
}

/**
 * Finds and extracts a specific cookie from a cookie header string.
 *
 * Searches for a cookie with the specified name in the provided cookie string
 * and returns the complete cookie key-value pair (name=value) if found.
 *
 * @param cookies - The cookie header string containing one or more cookies separated by semicolons
 * @param name - The name of the cookie to search for
 * @returns The complete cookie string (name=value) if found, undefined otherwise
 *
 * @example
 * findCookie('sessionId=abc123; _iidt=xyz789; theme=dark', '_iidt')
 * // returns '_iidt=xyz789'
 *
 * @example
 * findCookie('sessionId=abc123; theme=dark', 'nonexistent')
 * // returns undefined
 */
export function findCookie(cookies: string, name: string): string | undefined {
  const parsedCookies = parseCookies(cookies)
  const value = parsedCookies.get(name)

  if (typeof value === 'string') {
    return new Cookie(name, value).toCookieString()
  }

  return undefined
}
/**
 * Cookies object.
 */
export type Cookies = Map<string, string | undefined>

/**
 * Parse a `Cookie` header.
 *
 * Parse the given cookie header string into an object
 * The object has the various cookies as keys(names) => values
 */
export function parseCookies(str: string): Cookies {
  const obj: Cookies = new Map()
  const len = str.length
  // RFC 6265 sec 4.1.1, RFC 2616 2.2 defines a cookie name consists of one char minimum, plus '='.
  if (len < 2) {
    return obj
  }

  let index = 0

  do {
    const eqIdx = eqIndex(str, index, len)
    if (eqIdx === -1) {
      break
    } // No more cookie pairs.

    const endIdx = endIndex(str, index, len)

    if (eqIdx > endIdx) {
      // backtrack on prior semicolon
      index = str.lastIndexOf(';', eqIdx - 1) + 1
      continue
    }

    const key = valueSlice(str, index, eqIdx)

    // only assign once
    if (obj.get(key) === undefined) {
      obj.set(key, valueSlice(str, eqIdx + 1, endIdx))
    }

    index = endIdx + 1
  } while (index < len)

  return obj
}

/**
 * Find the `;` character between `min` and `len` in str.
 */
function endIndex(str: string, min: number, len: number) {
  const index = str.indexOf(';', min)
  return index === -1 ? len : index
}

/**
 * Find the `=` character between `min` and `max` in str.
 */
function eqIndex(str: string, min: number, max: number) {
  const index = str.indexOf('=', min)
  return index < max ? index : -1
}

/**
 * Slice out a value between startPod to max.
 */
function valueSlice(str: string, min: number, max: number) {
  let start = min
  let end = max

  do {
    const code = str.charCodeAt(start)
    if (code !== 0x20 /*   */ && code !== 0x09 /* \t */) {
      break
    }
  } while (++start < end)

  while (end > start) {
    const code = str.charCodeAt(end - 1)
    if (code !== 0x20 /*   */ && code !== 0x09 /* \t */) {
      break
    }
    end--
  }

  return str.slice(start, end)
}

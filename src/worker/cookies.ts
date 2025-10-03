/**
 * Finds and extracts a specific cookie from a cookie header string.
 *
 * Searches for a cookie with the specified name in the provided cookie string
 * and returns the complete cookie key-value pair (name=value) if found.
 * The function uses regex pattern matching to locate the cookie.
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
  const regex = new RegExp(`(${name}=[^;]+)`)

  const cookieMatch = regex.exec(cookies)
  if (cookieMatch && cookieMatch[1]) {
    console.debug(`Found ${name} cookie :`, cookieMatch[1])
    return cookieMatch[1]
  }

  return undefined
}

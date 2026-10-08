/**
 * Resolves Headers from fetch() call parameters for "header already set" checks.
 */
export function getHeadersFromFetchParams(params: Parameters<typeof fetch>): Headers | undefined {
  const input = params[0]
  const init = params[1]

  if (input instanceof Request) {
    // Request headers plus any init overrides
    const headers = new Headers(input.headers)
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => {
        headers.set(key, value)
      })
    }
    return headers
  }

  if (init?.headers) {
    return new Headers(init.headers)
  }

  return undefined
}

/**
 * Resolves the HTTP method from a RequestInit object, defaulting to 'GET' if not specified.
 *
 * @param requestInit - `RequestInit` object that may contain a method property
 * @returns The HTTP method string, defaults to 'GET' if not provided
 */
export function resolveRequestInitMethod(requestInit: RequestInit) {
  return requestInit?.method ?? 'GET'
}

/**
 * Sets a header for a fetch request by copying the `Headers`, if set and updating the new `Headers` object
 *
 * @param name - The header name to set
 * @param value - The header value to set
 * @param requestInit - The `RequestInit` to update.
 */
export function setHeaderForRequestInit(name: string, value: string, requestInit: RequestInit) {
  const newHeaders = new Headers(requestInit.headers)
  newHeaders.set(name, value)
  requestInit.headers = newHeaders
}

/**
 * Sets the `RequestInit.credentials` property to `include`, returning the original value
 *
 * @param requestInit the `RequestInit`
 * @returns the updated `RequestInit` or if the requestInit parameter was not defined, a new `RequestInit` object
 */
export function setIncludeCredentialsForRequestInit(requestInit: RequestInit): boolean {
  const appIncludedCredentials = requestInit.credentials === 'include'
  requestInit.credentials = 'include'
  return appIncludedCredentials
}

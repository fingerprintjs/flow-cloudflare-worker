/**
 * Resolves the HTTP method from a RequestInit object, defaulting to 'GET' if not specified.
 *
 * @param requestInit - Optional RequestInit object that may contain a method property
 * @returns The HTTP method string, defaults to 'GET' if not provided
 */
export function resolveRequestInitMethod(requestInit?: RequestInit) {
  return requestInit?.method ?? 'GET'
}

export type FetchParamsWithRequestInit = [any, RequestInit | undefined]

/**
 * Sets a header for a fetch request by modifying the RequestInit object in the fetch parameters.
 *
 * If a RequestInit object exists, it updates the headers. If no RequestInit exists, it creates
 * a new one with the specified header.
 *
 * @param name - The header name to set
 * @param value - The header value to set
 * @param fetchParams - Array containing fetch parameters where the second element is RequestInit
 */
export function setHeaderForRequestInit(name: string, value: string, fetchParams: FetchParamsWithRequestInit) {
  const requestInit = fetchParams[1]

  let headers: Headers

  if (requestInit) {
    if (requestInit.headers instanceof Headers) {
      headers = requestInit.headers
    } else {
      headers = new Headers(requestInit.headers)
      requestInit.headers = headers
    }
  } else {
    headers = new Headers()

    // If no requestInit was provided, create it as a second argument
    fetchParams[1] = { headers }
  }

  headers.set(name, value)
}

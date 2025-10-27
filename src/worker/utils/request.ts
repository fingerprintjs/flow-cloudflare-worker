interface CopyRequestParams {
  // The original request to be copied
  request: Request
  // Object containing custom settings to apply to the new Request
  init: RequestInit
  // Optional parameter to specify a new URL for the copied Request. If empty, the original request URL is used.
  url?: string | URL
}

/**
 * Creates a new Request object by copying an existing one and optionally modifying its URL.
 * Using `Request.clone()` in Cloudflare runtime is not recommended: https://developers.cloudflare.com/workers/examples/modify-request-property/
 *
 * @return {Request} A new Request object based on the original, with any modifications applied.
 *
 * @example Modifing headers in a request.
 * ```typescript
 * const request = new Request('https://example.com/', { headers: { 'Original-Header': 'value' }, method: 'GET' })
 *
 * // In case if you'd like to completly overwrite headers, use 'new Headers()' instead.
 * const updatedHeaders = new Headers(request.headers)
 * updatedHeaders.set('X-New-Header', 'new-value')
 *
 * const modifiedRequest = copyRequest({
 *   request,
 *   init: {
 *     // Updates request headers with new values
 *     headers: updatedHeaders,
 *     // Modify request method
 *     method: 'POST',
 *   },
 * })
 *
 * console.log(modifiedRequest.headers.get('X-New-Header')) // 'new-value'
 * console.log(modifiedRequest.headers.get('Original-Header')) // 'value'
 * ```
 */
export function copyRequest({ request, init, url }: CopyRequestParams): Request<unknown, IncomingRequestCfProperties> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return new Request(url ?? request.url, new Request(request, init)) as unknown as Request<
    unknown,
    IncomingRequestCfProperties
  >
}

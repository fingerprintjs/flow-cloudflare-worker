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
 * @example
 * ```typescript
 *
 * const request = new Request('https://example.com/api/resource');
 *
 * const modifiedRequest = copyRequest(request, {
 *    headers: {
 *     'X-Custom-Header': 'custom-value'
 *   }
 * }, 'https://example.com/api/modified-resource');
 * ```
 */
export function copyRequest({ request, init, url }: CopyRequestParams): Request<unknown, IncomingRequestCfProperties> {
  return new Request(url ?? request.url, new Request(request, init)) as unknown as Request<
    unknown,
    IncomingRequestCfProperties
  >
}

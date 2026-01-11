/**
 * Create a new worker `Response` with the same body and status but new headers.
 *
 * By default, the headers are immutable, even when `Response.clone` is used. This function
 * creates a new `Response` object with the specified headers.
 *
 * @param response the `Response` to copy
 * @param newHeaders the new `Headers` for the `Response`
 */
export function copyResponseWithNewHeaders(response: Response, newHeaders: Headers): Response {
  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
    statusText: response.statusText,
    cf: response.cf,
  })
}

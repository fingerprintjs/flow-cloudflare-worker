import { SIGNALS_KEY } from '../../shared/const'
import { TypedEnv } from '../types'
import { getAllowedOrigin } from '../urlMatching'
import { removeHeaderValue } from '../utils/headers'
import { fetchOrigin } from '../utils/origin'
import { copyRequest, setCorsHeadersForInstrumentation } from '../utils/request'
import { copyResponseWithNewHeaders } from '../utils/response'

export type HandleProtectedApiOptionsParams = {
  request: Request
  env: TypedEnv
}

export async function handleProtectedApiOptionsCall({
  request,
  env,
}: HandleProtectedApiOptionsParams): Promise<Response> {
  // Check if the OPTIONS request was caused by the addition
  // of the signals header to the instrumented request
  const accessControlRequestHeaders = request.headers.get('Access-Control-Request-Headers')
  const accessControlRequestMethod = request.headers.get('Access-Control-Request-Method')
  if (
    accessControlRequestHeaders === SIGNALS_KEY &&
    (accessControlRequestMethod === 'GET' || accessControlRequestMethod === 'POST')
  ) {
    const allowedOrigin = getAllowedOrigin(request, env)
    if (allowedOrigin) {
      // This state implies that the cross-origin request would have been a simple request
      // if not for the inclusion of the signals in the request headers. As
      // a result, the worker needs to handle this request because the origin is not
      // guaranteed to handle it.
      console.debug('Handled instrumentation-triggered preflight request without forwarding to origin')
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Headers': SIGNALS_KEY,
          'Access-Control-Allow-Methods': accessControlRequestMethod,
          'Access-Control-Allow-Credentials': 'true',
        },
      })
    }

    // This should not occur in practice because an instrumented request should
    // always originate from an identification page, and if
    // Access-Control-Request-Headers is set to SIGNALS_KEY, that likely
    // indicates an issue with the setup. Attempt to fail gracefully and let the
    // origin handle this error case.
  }

  let originRequest = request
  const accessControlRequestHeadersValues = accessControlRequestHeaders
    ? accessControlRequestHeaders.split(',').map((s) => s.trim())
    : []
  if (accessControlRequestHeadersValues.includes(SIGNALS_KEY)) {
    // The SIGNALS_KEY needs to be removed from the forwarded request to
    // avoid unexpected results from the origin.

    const originRequestHeaders = new Headers(request.headers)

    removeHeaderValue(originRequestHeaders, 'Access-Control-Request-Headers', SIGNALS_KEY)

    originRequest = copyRequest({
      request,
      init: {
        headers: originRequestHeaders,
      },
    })
  }

  const originResponse = await fetchOrigin(originRequest)

  const originResponseHeaders = new Headers(originResponse.headers)

  setCorsHeadersForInstrumentation(request, originResponseHeaders)

  return copyResponseWithNewHeaders(originResponse, originResponseHeaders)
}

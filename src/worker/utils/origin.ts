import { TypedEnv } from '../types'
import { IdentificationClient } from '../fingerprint/identificationClient'
import { createEdgeResponseHeaders, mergeHeaders } from './headers'
import { copyResponseWithNewHeaders } from './response'
import { isEdgeApiEnabled } from '../env'

export function fetchOrigin(request: Request) {
  const origin = import.meta.env.VITE_ORIGIN

  if (origin) {
    const originUrl = new URL(origin)
    const requestUrl = new URL(request.url)

    originUrl.pathname = requestUrl.pathname
    originUrl.search = requestUrl.search
    const headers = new Headers(request.headers)
    headers.set('Host', originUrl.host)

    console.log(`Using local override: ${originUrl}`)
    return fetch(originUrl, {
      //duplex: 'half', // The CF types don't support duplex right now but wrangler needs it locally
      headers,
      method: request.method,
      body: request.body,
    })
  }

  return fetch(request)
}

/**
 * Fetches the origin response using the Edge API if the environment configuration allows it.
 * Falls back to fetching directly from the origin if the Edge API is not configured.
 *
 *
 * @param {Request} request The HTTP request object to be processed.
 * @param {IdentificationClient} identificationClient The client responsible for edge identification operations.
 * @param {TypedEnv} env The environment configuration object containing API details and settings.
 * @return {Promise<Response>} A promise that resolves to the origin response with edge headers merged in if the Edge API is enabled.
 */
export async function fetchOriginWithEdgeAPI(
  request: Request,
  identificationClient: IdentificationClient,
  env: TypedEnv
): Promise<Response> {
  if (!isEdgeApiEnabled(env)) {
    return fetchOrigin(request)
  }

  const [originResponse, edgeResponse] = await Promise.all([
    fetchOrigin(request),
    identificationClient.safeEdge(request),
  ])

  if (edgeResponse) {
    const edgeResponseHeaders = createEdgeResponseHeaders(edgeResponse)

    return copyResponseWithNewHeaders(originResponse, mergeHeaders(originResponse.headers, edgeResponseHeaders))
  }

  return originResponse
}

import { TypedEnv } from '../types'
import { IdentificationClient } from '../fingerprint/identificationClient'
import { createEdgeResponseHeaders, mergeHeaders } from './headers'
import { isEdgeApiEnabled } from '../env'
import { copyRequest } from './request'
import { EdgeResponse } from '../fingerprint/identificationClientTypes'

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
 * Fetches the origin with the Edge API headers if enabled, otherwise directly fetches the origin.
 *
 * @param {Request} request - The incoming HTTP request to be processed.
 * @param {IdentificationClient} identificationClient - The client responsible for interacting with the Edge API.
 * @param {TypedEnv} env - The environment configuration object, used to determine if the Edge API is enabled.
 * @return {Promise<Response>} A promise that resolves to the HTTP response from the origin.
 */
export async function fetchOriginWithEdgeAPIRequest(
  request: Request,
  identificationClient: IdentificationClient,
  env: TypedEnv
): Promise<Response> {
  if (!isEdgeApiEnabled(env)) {
    return fetchOrigin(request)
  }

  const edgeResponse = await identificationClient.safeEdge(request)

  return fetchOriginWithEdgeAPIHeaders(request, env, edgeResponse)
}

/**
 * Fetches the origin resource with custom headers from the Edge API
 * if the Edge API is enabled. Merges the original request headers
 * with the headers generated from the Edge API response.
 *
 * @param {Request} request - The original request object.
 * @param {TypedEnv} env - The environment settings, determines if Edge API is enabled.
 * @param {EdgeResponse} [edgeResponse] - Optional response from the Edge API, used to create additional headers.
 * @return {Promise<Response>} A promise that resolves to the response from the origin server.
 */
export async function fetchOriginWithEdgeAPIHeaders(
  request: Request,
  env: TypedEnv,
  edgeResponse?: EdgeResponse
): Promise<Response> {
  if (!isEdgeApiEnabled(env)) {
    return fetchOrigin(request)
  }

  const edgeHeaders = createEdgeResponseHeaders(edgeResponse)

  const originRequestHeaders = new Headers(request.headers)
  const originRequest = copyRequest({
    request,
    init: {
      headers: mergeHeaders(originRequestHeaders, edgeHeaders),
    },
  })

  return fetchOrigin(originRequest)
}

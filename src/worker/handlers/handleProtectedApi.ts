import { SIGNALS_HEADER } from '../../shared/const'
import { TypedEnv } from '../types'
import { getIngressBaseHost } from '../env'
import { getIngressUrl, IngressClient } from '../fingerprint/ingress'
import { fetchOrigin } from '../utils/origin'

export type HandleProtectedApiCallParams = {
  request: Request
  env: TypedEnv
  ingressClient: IngressClient
}

export async function handleProtectedApiCall({
  request,
  env,
  ingressClient,
}: HandleProtectedApiCallParams): Promise<Response> {
  const signals = request.headers.get(SIGNALS_HEADER)
  if (!signals) {
    console.warn('No signals found in request headers for protected API call', request.url)

    // TODO Use response text from env
    return new Response('', { status: 403 })
  }

  const { agentData, setCookieHeaders, products } = await ingressClient.send(request)

  const originResponse = await fetchOrigin(request)

  if (setCookieHeaders.length) {
    setCookieHeaders.forEach((cookie) => {
      originResponse.headers.append('Set-Cookie', cookie)
    })
  }

  return originResponse
}

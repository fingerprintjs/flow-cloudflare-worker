import { AGENT_DATA_HEADER, SIGNALS_HEADER } from '../../shared/const'
import { IngressClient, SendResult } from '../fingerprint/ingress'
import { fetchOrigin } from '../utils/origin'

export type HandleProtectedApiCallParams = {
  request: Request
  ingressClient: IngressClient
}

export async function handleProtectedApiCall({
  request,
  ingressClient,
}: HandleProtectedApiCallParams): Promise<Response> {
  const signals = request.headers.get(SIGNALS_HEADER)
  if (!signals) {
    console.warn('No signals found in request headers for protected API call', request.url)

    // TODO Use response text from env
    return new Response('', { status: 403 })
  }
  const [ingressResponse, originResponse] = await Promise.all([ingressClient.send(request), fetchOrigin(request)])

  const originResponseHeaders = new Headers(originResponse.headers)

  setHeadersFromIngressToOrigin(ingressResponse, originResponseHeaders)

  // Re-create the response, because by default its headers are immutable
  return new Response(originResponse.body, {
    status: originResponse.status,
    headers: originResponseHeaders,
    statusText: originResponse.statusText,
    cf: originResponse.cf,
  })
}

function setHeadersFromIngressToOrigin(ingressResponse: SendResult, originResponseHeaders: Headers) {
  const { agentData, setCookieHeaders } = ingressResponse
  console.debug('Adding agent data header', agentData)
  originResponseHeaders.set(AGENT_DATA_HEADER, agentData)

  if (setCookieHeaders.length) {
    console.debug('Adding set-cookie headers from ingress response', setCookieHeaders)
    setCookieHeaders.forEach((cookie) => {
      originResponseHeaders.append('Set-Cookie', cookie)
    })
  }
}

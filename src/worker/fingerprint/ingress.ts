import { Region } from './region'
import { SIGNALS_HEADER } from '../../shared/const'
import { IngressRequestFailedError, SignalsNotAvailableError } from '../errors'
import { getHeaderOrThrow } from '../utils/headers'

type SendBody = {
  fingerprintData: string
  clientHost: string
  clientIP: string
  clientUserAgent: string
  clientCookie?: string
  clientHeaders?: Record<string, string>

  ruleset_context?: {
    ruleset_id: string
  }
}

export type SendResponse = {
  agentData: string
}

export type SendResult = SendResponse & {
  setCookieHeaders: string[]
}

export class IngressClient {
  private readonly url: URL

  constructor(
    region: Region,
    baseUrl: string,
    private readonly apiKey: string,
    private readonly ruleSetId: string
  ) {
    const resolvedUrl = IngressClient.resolveUrl(region, baseUrl)
    console.debug('Resolved ingress URL:', resolvedUrl)
    this.url = new URL(resolvedUrl)
  }

  async send(incomingRequest: Request): Promise<SendResult> {
    const signals = incomingRequest.headers.get(SIGNALS_HEADER)
    if (!signals) {
      throw new SignalsNotAvailableError()
    }

    const clientIP = getHeaderOrThrow(incomingRequest.headers, 'cf-connecting-ip')
    const clientHost = getHeaderOrThrow(incomingRequest.headers, 'host')
    const clientUserAgent = getHeaderOrThrow(incomingRequest.headers, 'user-agent')
    const clientCookie = incomingRequest.headers.get('cookie')

    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Auth-API-Key', this.apiKey)

    const clientHeaders = incomingRequest.clone().headers

    let cookieToSend: string | undefined
    if (clientCookie) {
      // Try to find _iidt cookie specifically
      const iidtMatch = /(_iidt=[^;]+)/.exec(clientCookie)
      if (iidtMatch && iidtMatch[1]) {
        cookieToSend = iidtMatch[1].split('=')[1]
      } else {
        cookieToSend = clientCookie
      }
    }

    const sendBody: SendBody = {
      clientIP,
      clientHost,
      clientUserAgent,
      fingerprintData: signals,

      ruleset_context: {
        ruleset_id: this.ruleSetId,
      },
    }

    if (cookieToSend) {
      sendBody.clientCookie = cookieToSend
    }

    const clientHeadersEntries = Array.from(clientHeaders.entries())
    if (clientHeadersEntries.length) {
      sendBody.clientHeaders = Object.fromEntries(clientHeadersEntries)
    }

    const requestUrl = new URL(this.url)
    requestUrl.pathname = '/send'

    const ingressRequest = new Request(requestUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(sendBody),
    })

    const ingressResponse = await fetch(ingressRequest)
    console.debug(`Received ingress response for ${requestUrl} request with status:`, ingressResponse.status)
    if (!ingressResponse.ok) {
      const errorText = await ingressResponse.text()
      console.error(`Ingress request failed with status: ${ingressResponse.status}`, errorText)
      throw new IngressRequestFailedError(errorText, ingressResponse.status)
    }

    const ingressData = await ingressResponse.json<SendResponse>()
    console.debug(`Ingress response data:`, ingressData)

    const cookiesToSent = ingressResponse.headers.getAll('Set-Cookie')

    return {
      ...ingressData,
      agentData: ingressData.agentData,
      setCookieHeaders: cookiesToSent,
    }
  }

  private static resolveUrl(region: Region, host: string) {
    switch (region) {
      case 'us':
        return `https://${host}`

      default:
        return `https://${region}.${host}`
    }
  }
}

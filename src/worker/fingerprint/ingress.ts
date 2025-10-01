import { Region } from './region'
import { SIGNALS_HEADER } from '../../shared/const'
import { HeaderMissingError, IngressRequestFailedError, SignalsNotAvailableError } from '../errors'
import type { EventsGetResponse } from '@fingerprintjs/fingerprintjs-pro-server-api'

type SendBod2y = {
  fingerprintData: string
  clientHost: string
  clientIP: string
  clientUserAgent: string
  clientCookie?: string
  clientHeaders?: Record<string, string>

  ruleset_context: {
    ruleset_id: string
  }
}

export type SendResponse = EventsGetResponse & {
  agentData: unknown
}

export type SendResult = SendResponse & {
  setCookieHeaders: string[]
}

export class IngressClient {
  private url: URL

  constructor(
    region: Region,
    baseUrl: string,
    private readonly apiKey: string,
    private readonly ruleSetId: string
  ) {
    this.url = new URL(IngressClient.resolveUrl(region, baseUrl))
  }

  async send(incomingRequest: Request): Promise<SendResult> {
    const signals = incomingRequest.headers.get(SIGNALS_HEADER)
    if (!signals) {
      throw new SignalsNotAvailableError()
    }

    const getHeaderOrThrow = (header: string) => {
      const value = incomingRequest.headers.get(header)
      if (!value) {
        throw new HeaderMissingError(header)
      }
      return value
    }

    const clientIP = getHeaderOrThrow('cf-connecting-ip')
    const clientHost = getHeaderOrThrow('host')
    const clientUserAgent = getHeaderOrThrow('user-agent')
    const clientCookie = incomingRequest.headers.get('cookie')

    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Auth-API-Key', this.apiKey)

    const clientHeaders = new Headers()
    incomingRequest.headers.forEach((value, key) => {
      clientHeaders.set(key, value)
    })

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

  private static resolveUrl(region: Region, baseUrl: string) {
    switch (region) {
      case 'us':
        return `${baseUrl}`

      default:
        return `${region}.${baseUrl}`
    }
  }
}

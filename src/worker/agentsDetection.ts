import {
  EventsGetResponse,
  FingerprintJsServerApiClient,
  RequestError,
} from '@fingerprintjs/fingerprintjs-pro-server-api'
import { getIp } from './utils/headers'
import { z } from 'zod/v4'
import { getSecretKey } from './env'
import { TypedEnv } from './types'
import { IdentificationClient } from './fingerprint/identificationClient'

const GLOBAL_TOKEN_STORE = 'tokens'

export const ALLOWED_REQUEST_TIMESTAMP_DIFF_MS = 7000

async function validateRequestId(request: Request, requestId: string, env: TypedEnv): Promise<Response | undefined> {
  const fpClient = new FingerprintJsServerApiClient({
    apiKey: getSecretKey(env),
    fetch: fetchHelper,
  })

  try {
    const event = await fpClient.getEvent(requestId)
    if (!(await validateIdentificationEvent(request, event))) {
      return Response.json({ message: 'invalid event' }, { status: 400 })
    }
  } catch (e) {
    if (e instanceof RequestError) {
      console.warn(`Failed to get event for request ID "${requestId}"`, e)
      return Response.json({ message: 'invalid request ID' }, { status: 400 })
    }

    throw e
  }

  return undefined
}

const reportRequestSchema = z.object({
  token: z.string(),
  signals: z.string(),
})

export async function storeToken(request: Request, env: TypedEnv): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405 })
  }

  console.info('Storing token with signals')

  const body = await request.json()
  const parseResult = reportRequestSchema.safeParse(body)
  if (parseResult.error) {
    return new Response(null, { status: 400 })
  }

  const reportRequest = parseResult.data

  const tokenStore = env.TokenStore.getByName(GLOBAL_TOKEN_STORE)
  await tokenStore.storeEntry(reportRequest.token, {
    signals: reportRequest.signals,
  })
  return Response.json({ message: 'success' })
}

async function updateTagsForEvent(
  tokenRequest: Request,
  env: TypedEnv,
  requestId: string,
  token: string
): Promise<void> {
  const fpClient = new FingerprintJsServerApiClient({
    apiKey: getSecretKey(env),
    fetch: fetchHelper,
  })
  const headers: Record<string, string> = {}
  for (const [name, value] of tokenRequest.headers.entries()) {
    headers[name] = value
  }

  await fpClient
    .updateEvent(
      {
        tag: {
          'agentic-browser-headers': headers,
          'agentic-browser-token': token,
        },
      },
      requestId
    )
    .catch(async (error) => {
      if (error instanceof RequestError && error.statusCode === 409) {
        console.info('Event not ready for update, retrying in 1 second.')
        await new Promise((resolve) => setTimeout(resolve, 1000))

        await updateTagsForEvent(tokenRequest, env, requestId, token)
      } else {
        console.log('failed to update event', error)
      }
    })
}

export async function handleDetectionTokenRequest(
  url: URL,
  request: Request,
  env: TypedEnv,
  identificationClient: IdentificationClient
): Promise<Response> {
  try {
    const token = url.searchParams.get('sessionId')
    console.debug('Received token request:', token)

    if (token) {
      const tokenStore = env.TokenStore.getByName(GLOBAL_TOKEN_STORE)
      const entry = await tokenStore.getEntry(token)

      if (entry) {
        let requestId: string
        if (entry.requestId) {
          console.info(`Entry already has request id`)
          requestId = entry.requestId
        } else {
          console.info(`Sending request to ingress service to get request id`)
          const response = await identificationClient.send(request, entry.signals)
          requestId = response.eventId
        }

        await validateRequestId(request, requestId, env)

        if (!requestId) {
          console.warn(`Received request with unknown token: "${token}"`)
        } else {
          await updateTagsForEvent(request, env, requestId, token)
          console.log(`Successfully updated tags for event "${requestId}"`)
          await tokenStore.deleteRequestId(token)
        }
      }
    }
  } catch (e) {
    console.error('Failed to handle token request', e)
  }

  // Always return the canned response to avoid leaking the token detection
  // request to the end-user
  return Response.json([])
}

export async function associateRequestIdWithSignal(env: TypedEnv, signals: string, requestId: string): Promise<void> {
  console.log('Attempting to associate request ID with signal', requestId)

  const tokenStore = env.TokenStore.getByName(GLOBAL_TOKEN_STORE)
  const rawEntries = await tokenStore.listAll()
  console.info(`Found tokens in token store`, rawEntries)
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const entries = Array.from(rawEntries.entries())

  for (const [detectionToken, entry] of entries) {
    if (entry.signals !== signals) {
      continue
    }

    console.info(`Found matching signal for token "${detectionToken}" for request ID "${requestId}`)

    await tokenStore.storeEntry(detectionToken, {
      ...entry,
      requestId,
    })
  }
}

export const IPv4_REGEX = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.){3}(25[0-5]|(2[0-4]|1\d|[1-9]|)\d)$/

function visitIpMatchesRequestIp(eventIp: string, clientIp: string): boolean {
  // IPv6 addresses are not supported yet, skip the check
  if (!IPv4_REGEX.test(clientIp)) {
    return true
  }

  if (clientIp === '127.0.0.1') {
    // This indicates locally running
    return true
  }

  return clientIp === eventIp
}

async function validateIdentificationEvent(request: Request, event: EventsGetResponse): Promise<boolean> {
  const identification = event.products.identification?.data
  if (!identification) {
    console.warn('Identification data not found, potential spoofing attack.')
    return false
  }

  // The client request must come from the same IP address as the identification request.
  const clientIp = await getIp(request.headers)
  if (!visitIpMatchesRequestIp(identification.ip, clientIp)) {
    console.warn('Identification IP does not match request IP, potential spoofing attack.')
    return false
  }

  /**
   * An attacker might have acquired a valid requestId and visitorId via phishing.
   * It's recommended to check freshness of the identification request to prevent replay attacks.
   */
  if (Date.now() - Number(new Date(identification.time)) > ALLOWED_REQUEST_TIMESTAMP_DIFF_MS) {
    console.warn('Old identification request, potential replay attack.')
    return false
  }

  return true
}

// Fetch helper for fp sdk
async function fetchHelper(url: string | URL | Request<unknown, CfProperties<unknown>>, init?: RequestInit) {
  return fetch(url, init)
}

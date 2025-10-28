import { createResponseWithMaxAge, fetchCacheable } from '../utils/cache'
import { copyRequest } from '../utils/request'

const workerTtl = 60

function copySearchParams(oldURL: URL, newURL: URL): void {
  newURL.search = new URLSearchParams(oldURL.search).toString()
}

/**
 * Fetches and returns a script with FingerprintJS Pro agent loader for the specified public API key.
 * Note: The fetched script is cached using the `fetchCacheable` function.
 *
 * @param {Request} incomingRequest - The incoming HTTP request received by the worker.
 * @param {string} publicApiKey - The public API key used to generate the script URL.
 * @param {string} cdnHost - Hostname of the Fingerprint CDN.
 * @return {Promise<Response>} A promise that resolves to a Response object containing the fetched script with the 'Content-Type' header set to 'application/javascript'.
 */
export async function getAgentLoader(
  incomingRequest: Request,
  publicApiKey: string,
  cdnHost: string
): Promise<Response> {
  const fpScriptUrl = new URL(`https://${cdnHost}/v4/${publicApiKey}`)
  copySearchParams(new URL(incomingRequest.url), fpScriptUrl)

  console.debug('Fetching agent loader from:', fpScriptUrl)

  const requestHeaders = new Headers(incomingRequest.headers)
  requestHeaders.delete('Cookie')

  const request = copyRequest({
    request: incomingRequest,
    url: fpScriptUrl,
    init: {
      headers: requestHeaders,
    },
  })

  return await fetchCacheable(request, workerTtl).then((response) =>
    createResponseWithMaxAge(response, {
      // Cache in browser for up to 1 hour
      maxAge: 3600,
      // Cache in CDN for up to 1 minute
      sMaxAge: 60,
    })
  )
}

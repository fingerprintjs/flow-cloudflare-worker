import { copyRequest } from '../utils/request'
import { addIntegrationInfo } from '../../shared/integrationInfo'

/**
 * Fetches and returns a script with FingerprintJS Pro agent loader for the specified public API key.
 * The response is returned as received, without platform caching or header changes.
 *
 * @param {Request} incomingRequest - The incoming HTTP request received by the worker.
 * @param {string} publicApiKey - The public API key used to generate the script URL.
 * @param {string} cdnHost - Hostname of the Fingerprint CDN.
 * @return {Promise<Response>} A promise that resolves to the unchanged Fingerprint CDN response.
 */
export async function getAgentLoader(
  incomingRequest: Request,
  publicApiKey: string,
  cdnHost: string
): Promise<Response> {
  // Query params from the incoming request are not forwarded to the CDN
  const fpScriptUrl = new URL(`https://${cdnHost}/v4/${publicApiKey}`)
  addIntegrationInfo(fpScriptUrl, 'procdn')

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

  return fetch(request)
}

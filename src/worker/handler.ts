import { TypedEnv } from './types'
import { matchUrl } from './urlMatching'
import { handleScriptsInjection } from './handlers/handleScriptsInjection'
import { handleScript } from './handlers/handleScript'
import {
  getCDNHost,
  getFallbackRuleAction,
  getFpRegion,
  getIngressBaseHost,
  getProtectedApis,
  getPublicKey,
  getRoutePrefix,
  getRulesetId,
  getSecretKey,
  isMonitorMode,
} from './env'

import { handleError } from './handlers/handleError'
import { fetchOrigin } from './utils/origin'
import { handleProtectedApiCall } from './handlers/handleProtectedApi'
import { IdentificationClient } from './fingerprint/identificationClient'

export async function handleRequest(request: Request, env: TypedEnv): Promise<Response> {
  console.info('Handling request', request)

  const identificationClient = new IdentificationClient(
    getFpRegion(env),
    getIngressBaseHost(env),
    getSecretKey(env),
    getRoutePrefix(env),
    getRulesetId(env)
  )

  try {
    const matchedUrl = matchUrl(new URL(request.url), request.method, env)

    switch (matchedUrl?.type) {
      case 'identification':
        return await handleScriptsInjection({ request, env })

      case 'script':
        return await handleScript({
          request,
          script: matchedUrl.script,
          publicApiKey: getPublicKey(env),
          cdnHost: getCDNHost(env),
          protectedApis: getProtectedApis(env),
          routePrefix: getRoutePrefix(env),
        })

      case 'browserCache':
        if (request.method === 'GET') {
          return identificationClient.browserCache(request)
        }

        console.warn(`Invalid method for browser cache request: ${request.method}. Falling back to origin.`)

        return fetchOrigin(request)

      case 'protection':
        return await handleProtectedApiCall({
          request,
          identificationClient,
          fallbackRule: getFallbackRuleAction(env),
          routePrefix: getRoutePrefix(env),
          isMonitorMode: isMonitorMode(env),
        })

      default:
        console.info('No matched url')

        return fetchOrigin(request)
    }
  } catch (error) {
    return handleError(error)
  }
}

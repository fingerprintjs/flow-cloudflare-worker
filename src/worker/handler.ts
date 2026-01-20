import { TypedEnv } from './types'
import { matchUrl } from './urlMatching'
import { handleScriptsInjection } from './handlers/handleScriptsInjection'
import { handleScript } from './handlers/handleScript'
import {
  getCDNHost,
  getFallbackRuleAction,
  getFpLogLevel,
  getProtectedApis,
  getPublicKey,
  getRoutePrefix,
  isMonitorMode,
} from './env'

import { handleError } from './handlers/handleError'
import { fetchOrigin } from './utils/origin'
import { handleProtectedApiCall } from './handlers/handleProtectedApi'
import { IdentificationClient } from './fingerprint/identificationClient'

export async function handleRequest(request: Request, env: TypedEnv): Promise<Response> {
  console.info('Handling request', request)

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
          logLevel: getFpLogLevel(env),
        })

      case 'browserCache':
        if (request.method === 'GET') {
          return IdentificationClient.fromEnv(env).browserCache(request)
        }

        console.warn(`Invalid method for browser cache request: ${request.method}. Falling back to origin.`)

        return fetchOrigin(request)

      case 'protection':
        return await handleProtectedApiCall({
          request,
          identificationClient: IdentificationClient.fromEnv(env),
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

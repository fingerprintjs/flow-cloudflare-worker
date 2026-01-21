import { TypedEnv } from './types'
import { matchUrl } from './urlMatching'
import { handleScriptsInjection } from './handlers/handleScriptsInjection'
import { handleScript } from './handlers/handleScript'
import { getCDNHost, getFpLogLevel, getProtectedApis, getPublicKey, getRoutePrefix } from './env'

import { handleError } from './handlers/handleError'
import { fetchOrigin } from './utils/origin'
import { handleProtectedApiCall } from './handlers/handleProtectedApi'
import { IdentificationClient } from './fingerprint/identificationClient'
import { handleProtectedApiOptionsCall } from './handlers/handleProtectedApiOptions'

export async function handleRequest(request: Request, env: TypedEnv): Promise<Response> {
  console.info('Handling request', request)

  try {
    const matchedUrl = matchUrl(new URL(request.url), request.method, env)

    switch (matchedUrl?.type) {
      case 'identification':
        return handleScriptsInjection({ request, env })

      case 'script':
        return handleScript({
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
        if (matchedUrl.options) {
          return handleProtectedApiOptionsCall({ request, env })
        }

        return handleProtectedApiCall({
          request,
          identificationClient: IdentificationClient.fromEnv(env),
          env,
        })

      default:
        console.info('No matched url')

        return fetchOrigin(request)
    }
  } catch (error) {
    return handleError(error)
  }
}

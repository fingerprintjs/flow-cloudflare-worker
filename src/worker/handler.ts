import { TypedEnv } from './types'
import { matchUrl } from './urlMatching'
import { handleScriptsInjection } from './handlers/handleScriptsInjection'
import { handleScript } from './handlers/handleScript'
import {
  getCDNHost,
  getFpRegion,
  getIngressBaseHost,
  getProtectedApis,
  getPublicKey,
  getRoutePrefix,
  getSecretKey,
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
    getRoutePrefix(env)
  )

  try {
    const matchedUrl = matchUrl(new URL(request.url), request.method, env)

    switch (matchedUrl?.type) {
      case 'identification':
        return await handleScriptsInjection({ request: request, env: env })

      case 'script':
        return await handleScript({
          script: matchedUrl.script,
          publicApiKey: getPublicKey(env),
          cdnHost: getCDNHost(env),
          protectedApis: getProtectedApis(env),
          scriptBehaviorPath: getRoutePrefix(env),
        })

      case 'browserCache':
        return identificationClient.browserCache(request)

      case 'protection':
        return await handleProtectedApiCall({
          request,
          ingressClient: identificationClient,
        })

      default:
        console.info('No matched url')

        return fetchOrigin(request)
    }
  } catch (error) {
    return handleError(error)
  }
}

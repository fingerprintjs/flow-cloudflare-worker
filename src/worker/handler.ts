import { TypedEnv } from './types'
import { matchUrl } from './urlMatching'
import { handleScriptsInjection } from './handlers/handleScriptsInjection'
import { handleScript } from './handlers/handleScript'
import { getCDNHost, getProtectedApis, getPublicKey } from './env'

import { handleError } from './handlers/handleError'
import { fetchOrigin } from './utils/origin'

export async function handleRequest(request: Request, env: TypedEnv): Promise<Response> {
  console.info('Handling request', request)

  try {
    const matchedUrl = matchUrl(new URL(request.url), env)

    switch (matchedUrl?.type) {
      case 'identification':
        return handleScriptsInjection({ request: request, env: env })

      case 'script':
        return handleScript({
          script: matchedUrl.script,
          publicApiKey: getPublicKey(env),
          cdnHost: getCDNHost(env),
          protectedApis: getProtectedApis(env),
        })
      default:
        console.info('No matched url')

        return fetchOrigin(request)
    }
  } catch (error) {
    return handleError(error)
  }
}

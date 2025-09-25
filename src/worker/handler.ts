import { EnvWithAssets } from './types'
import { matchUrl } from './urlMatching'
import { handleScriptsInjection } from './handlers/handleScriptsInjection'
import { handleScript } from './handlers/handleScript'
import { getPublicKey } from './env'

import { handleError } from './handlers/handleError'
import { AssetsNotAvailableError } from './errors'

export async function handleRequest(request: Request, env: EnvWithAssets): Promise<Response> {
  console.info('Handling request', request)

  try {
    const matchedUrl = matchUrl(new URL(request.url), env)

    switch (matchedUrl?.type) {
      case 'identification':
        return handleScriptsInjection({ request: request, env: env })

      case 'script':
        if (!env.ASSETS) {
          throw new AssetsNotAvailableError()
        }

        return handleScript({
          request: request,
          script: matchedUrl.script,
          publicApiKey: getPublicKey(env),
          assets: env.ASSETS,
        })
      default:
        console.info('No matched url')

        return fetch(request)
    }
  } catch (error) {
    return handleError(error)
  }
}

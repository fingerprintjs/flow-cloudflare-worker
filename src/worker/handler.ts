import { EnvWithAssets } from './types'
import { matchUrl } from './urlMatching'
import { handleInstrumentationInjection } from './handlers/handleInstrumentationInjection'
import { handleInjectScript } from './handlers/handleInjectScript'

export async function handleRequest(request: Request, env: EnvWithAssets): Promise<Response> {
  console.info('Handling request', request)

  try {
    const matchedUrl = matchUrl(new URL(request.url), env)

    switch (matchedUrl?.type) {
      case 'identification':
        return handleInstrumentationInjection(request, env)

      case 'script':
        if (!env.ASSETS) {
          throw new Error('Assets are not available.')
        }

        return handleInjectScript(request, matchedUrl.script, env.ASSETS)
      default:
        console.info('No matched url')

        return fetch(request)
    }
  } catch (error) {
    console.error('Error handling request', error)

    return new Response('Internal Flow Error', { status: 500 })
  }
}

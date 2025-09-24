import { Env } from '../types'
import { hasContentType } from '../../utils/headers'
import { getScriptUrl } from '../scripts'

export async function handleInstrumentationInjection(request: Request, env: Env): Promise<Response> {
  console.info('Injecting instrumentation script for page:', request.url)

  // Propagate a request to the origin
  const response = await fetch(request)

  if (hasContentType(response.headers, 'text/html')) {
    try {
      console.info('Received HTML content, injecting instrumentation script.')

      return new HTMLRewriter()
        .on('head', {
          element(element) {
            console.info('Injecting instrumentation link and src into <head> element.')
            const scriptUrl = getScriptUrl('injector.iife.js', env)

            element.append(`<link rel="preload" href="${scriptUrl}" as="script" />`, { html: true })
            element.append(`<script src="${scriptUrl}"> </script>`, { html: true })
          },
        })
        .transform(response)
    } catch (error) {
      console.error('Error injecting instrumentation script:', error)

      return response
    }
  }

  return response
}

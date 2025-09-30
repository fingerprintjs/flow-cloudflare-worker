import { TypedEnv } from '../types'
import { hasContentType } from '../utils/headers'
import { getScriptUrl } from '../scripts'
import { fetchOrigin } from '../utils/origin'
import { PROTECTED_APIS_WINDOW_KEY } from '../../shared/const'
import { getProtectedApis } from '../env'

type HandleScriptsInjectionParams = {
  request: Request
  env: TypedEnv
}

/**
 * Handles the injection of instrumentation scripts into HTML responses.
 * If the response's content type is HTML, the method appends specified scripts to the `<head>` element of the document.
 *
 * @param {Object} params - The parameters for the function.
 * @param {Request} params.request - The incoming HTTP request.
 * @param {Object} params.env - The environment configuration object containing necessary script and resource paths.
 *
 * @return {Promise<Response>} A Promise that resolves to an HTTP Response, potentially modified with injected scripts if the content type is HTML.
 */
export async function handleScriptsInjection({ request, env }: HandleScriptsInjectionParams): Promise<Response> {
  console.info('Injecting instrumentation script for page:', request.url)

  // Propagate a request to the origin
  const response = await fetchOrigin(request)

  if (hasContentType(response.headers, 'text/html')) {
    try {
      console.info('Received HTML content, injecting agent and instrumentation scripts.')

      return new HTMLRewriter()
        .on('head', {
          element(element) {
            console.info('Injecting instrumentation and agent into <head> element.')

            // Inject URLs for the protected APIs for instrumentation
            element.append(
              `<script>window.${PROTECTED_APIS_WINDOW_KEY} = ${JSON.stringify(getProtectedApis(env))}</script>\n`,
              { html: true }
            )

            element.append(`<script src="${getScriptUrl('agent.iife.js', env)}"></script>\n`, { html: true })
            element.append(`<script src="${getScriptUrl('instrumentor.iife.js', env)}"></script>\n`, { html: true })
          },
        })
        .transform(response)
    } catch (error) {
      console.error('Error injecting instrumentation script:', error)
    }
  } else {
    console.warn('Received non-HTML content, skipping instrumentation script injection.')
  }

  return response
}

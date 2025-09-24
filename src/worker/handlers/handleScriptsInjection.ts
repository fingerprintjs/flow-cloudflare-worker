import { Env } from '../types'
import { hasContentType } from '../utils/headers'
import { getScriptUrl } from '../scripts'
import { getScriptBehaviourPath } from '../env'

type HandleScriptsInjectionParams = {
  request: Request
  env: Env
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
  const response = await fetch(request)

  if (hasContentType(response.headers, 'text/html')) {
    try {
      console.info('Received HTML content, injecting instrumentation script.')

      return new HTMLRewriter()
        .on('head', {
          element(element) {
            console.info('Injecting instrumentation and agent into <head> element.')

            // Expose __FP_FLOW_SCRIPT_PATH__ that is the script behaviour path to the browser, so that we can pass it to the agent loader.
            element.append(`<script>window.__FP_FLOW_SCRIPT_PATH__ = "${getScriptBehaviourPath(env)}"</script>`, {
              html: true,
            })

            // When agent.iife.js is requested, we will fetch it from our CDN
            element.append(`<script src="${getScriptUrl('agent.iife.js', env)}"> </script>`, { html: true })
            element.append(`<script src="${getScriptUrl('instrumentation.iife.js', env)}"> </script>`, { html: true })
          },
        })
        .transform(response)
    } catch (error) {
      console.error('Error injecting instrumentation script:', error)
    }
  }

  return response
}

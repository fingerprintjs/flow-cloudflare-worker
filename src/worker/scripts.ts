import { Script } from '../shared/scripts'

export const scripts: Script[] = ['instrumentor.iife.js', 'loader.js', 'agent-processor.iife.js']

export function getScriptUrl(script: Script, routePrefix: string) {
  return `/${routePrefix}/${script}`
}

/**
 * Injects a script into the `<head>` element of an HTML document to load the agent processor
 * with specified agent data as a data attribute.
 *
 * @param {Response} response - The HTTP response containing the HTML content to modify.
 * @param {string} agentData - The agent-specific data to be injected as a data attribute in the script.
 * @param {string} routePrefix - The route prefix used to construct the script's source URL.
 * @return {Response} - A transformed HTTP response with the injected agent processor script.
 */
export function injectAgentProcessorScript(response: Response, agentData: string, routePrefix: string) {
  return new HTMLRewriter()
    .on('head', {
      element(element) {
        console.info('Injecting agent processor script into <head> element.')

        // Append script that loads the agent processor. Injects agent data as a data attribute.
        // Injected as an ` async ` script, since it doesn't depend on DOM structure and can be loaded in the background.
        element.append(
          `<script data-agent-data="${agentData}" async src="${getScriptUrl('agent-processor.iife.js', routePrefix)}"></script>\n`,
          {
            html: true,
          }
        )
      },
    })
    .transform(response)
}

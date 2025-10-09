import { resolveTemplates } from '../scripts'
// This bundles the instrumentor code with the worker: https://vite.dev/guide/assets.html#importing-asset-as-string
import instrumentorCode from '../../../public/instrumentor.iife.js?raw'
import { ProtectedApi } from '../../shared/types'
import { getAgentLoader } from '../fingerprint/agent'
import { Script } from '../../shared/scripts'

type HandleScriptParams = {
  script: Script
  publicApiKey: string
  cdnHost: string
  protectedApis: ProtectedApi[]
  routePrefix: string
}

/**
 * Handles fetching of the specific scripts based on the provided parameters.
 *
 * @param {Object} params - The parameters for handling the script.
 * @param {string} params.script - The name of the script to be handled.
 * @param {string} params.publicApiKey - The public API key used for fetching the agent loader.
 * @param {string} params.cdnHost - Hostname of the Fingerprint CDN.
 * @param {string} params.routePrefix - Path prefix for worker requests.
 * @param {ProtectedApi[]} params.protectedApis - Array of protected APIs to be injected into the instrumentation code.
 * @return {Promise<Response>} A promise that resolves to the script response.
 */
export async function handleScript({
  script,
  publicApiKey,
  cdnHost,
  protectedApis,
  routePrefix,
}: HandleScriptParams): Promise<Response> {
  switch (script) {
    case 'instrumentor.iife.js': {
      return new Response(
        resolveTemplates({
          protectedApis,
          code: instrumentorCode,
          routePrefix: routePrefix,
        }),
        {
          headers: {
            'Content-Type': 'application/javascript',
          },
        }
      )
    }

    case 'loader.js':
      return getAgentLoader(publicApiKey, cdnHost)
  }
}

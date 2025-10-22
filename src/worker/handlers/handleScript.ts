// This bundles the instrumentor code with the worker: https://vite.dev/guide/assets.html#importing-asset-as-string
import instrumentorCode from '../../../dist/instrumentor/instrumentor.iife.js?raw'
import agentProcessorCode from '../../../dist/agent-processor/agent-processor.iife.js?raw'
import { ProtectedApi } from '../../shared/types'
import { getAgentLoader } from '../fingerprint/agent'
import { Script } from '../../shared/scripts'
import { resolveTemplates } from '../utils/string'

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
        resolveTemplates(instrumentorCode, {
          '<WORKER_ROUTE_PREFIX>': routePrefix,
          // The " quotes are intentional here to prevent the template from being parsed as a string literal
          '"<PROTECTED_APIS>"': JSON.stringify(protectedApis),
        }),
        {
          headers: {
            'Content-Type': 'application/javascript',
          },
        }
      )
    }

    case 'agent-processor.iife.js': {
      return new Response(
        resolveTemplates(agentProcessorCode, {
          '<WORKER_ROUTE_PREFIX>': routePrefix,
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

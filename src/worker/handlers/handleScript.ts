import { Script } from '../scripts'
// This bundles the instrumentator code with the worker: https://vite.dev/guide/assets.html#importing-asset-as-string
import instrumentatorCode from '../../../public/instrumentor.iife.js?raw'
import { getAgentLoader } from '../fingerprint/agent'

type HandleScriptParams = {
  script: Script
  publicApiKey: string
  cdnHost: string
}

/**
 * Handles fetching of the specific scripts based on the provided parameters.
 *
 * @param {Object} params - The parameters for handling the script.
 * @param {string} params.script - The name of the script to be handled.
 * @param {string} params.publicApiKey - The public API key used for fetching the agent loader.
 * @param {string} params.cdnHost - Hostname of the Fingerprint CDN.
 * @return {Promise<Response>} A promise that resolves to the script response.
 */
export async function handleScript({ script, publicApiKey, cdnHost }: HandleScriptParams): Promise<Response> {
  switch (script) {
    case 'instrumentor.iife.js': {
      return new Response(instrumentatorCode, {
        headers: {
          'Content-Type': 'application/javascript',
        },
      })
    }

    case 'agent.iife.js':
      return getAgentLoader(publicApiKey, cdnHost)
  }
}

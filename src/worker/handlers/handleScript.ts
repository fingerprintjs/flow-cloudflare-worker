import { Script } from '../scripts'
import injectorUrl from '../../../public/instrumentation.iife.js?url'
import { getAgentLoader } from '../fingerprint/agent'

type HandleScriptParams = {
  request: Request
  script: Script
  publicApiKey: string
  assets: Fetcher
}

/**
 * Handles fetching of the specific scripts based on the provided parameters.
 *
 * @param {Object} params - The parameters for handling the script.
 * @param {Request} params.request - The request object used to resolve script URLs or handle fetching.
 * @param {string} params.script - The name of the script to be handled.
 * @param {string} params.publicApiKey - The public API key used for fetching the agent loader.
 * @param {Object} params.assets - An object to handle asset fetching operations.
 * @return {Promise<Response>} A promise that resolves to the script response.
 */
export async function handleScript({ request, script, publicApiKey, assets }: HandleScriptParams): Promise<Response> {
  switch (script) {
    case 'instrumentation.iife.js': {
      return assets.fetch(new URL(injectorUrl, request.url))
    }

    case 'agent.iife.js':
      return getAgentLoader(publicApiKey)
  }
}

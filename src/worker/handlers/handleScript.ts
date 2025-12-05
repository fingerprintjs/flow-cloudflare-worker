// This bundles the instrumentor code with the worker: https://vite.dev/guide/assets.html#importing-asset-as-string
import instrumentorCode from '../../../dist/instrumentor/instrumentor.iife.js?raw'
import agentProcessorCode from '../../../dist/agent-processor/agent-processor.iife.js?raw'
import { ProtectedApi } from '../../shared/types'
import { getAgentLoader } from '../fingerprint/agent'
import { Script } from '../../shared/scripts'
import { createWorkerScriptResponse } from '../scripts'
import { Buffer } from 'node:buffer'

type HandleScriptParams = {
  request: Request
  script: Script
  publicApiKey: string
  cdnHost: string
  protectedApis: ProtectedApi[]
  routePrefix: string
}

function generateDetectionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64url')
}

/**
 * Handles fetching of the specific scripts based on the provided parameters.
 *
 * @param {Object} params - The parameters for handling the script.
 * @param {Request} params.request - The incoming HTTP request.
 * @param {string} params.script - The name of the script to be handled.
 * @param {string} params.publicApiKey - The public API key used for fetching the agent loader.
 * @param {string} params.cdnHost - Hostname of the Fingerprint CDN.
 * @param {string} params.routePrefix - Path prefix for worker requests.
 * @param {ProtectedApi[]} params.protectedApis - Array of protected APIs to be injected into the instrumentation code.
 * @return {Promise<Response>} A promise that resolves to the script response.
 */
export async function handleScript({
  request,
  script,
  publicApiKey,
  cdnHost,
  protectedApis,
  routePrefix,
}: HandleScriptParams): Promise<Response> {
  switch (script) {
    case 'instrumentor.iife.js': {
      return createWorkerScriptResponse(instrumentorCode, {
        '<WORKER_ROUTE_PREFIX>': routePrefix,
        // The " quotes are intentional here to prevent the template from being parsed as a string literal
        '"<PROTECTED_APIS>"': JSON.stringify(protectedApis),
        '<DETECTION_TOKEN>': generateDetectionToken(),
      })
    }

    case 'agent-processor.iife.js': {
      return createWorkerScriptResponse(agentProcessorCode, {
        '<WORKER_ROUTE_PREFIX>': routePrefix,
      })
    }

    case 'loader.js':
      return getAgentLoader(request, publicApiKey, cdnHost)
  }
}

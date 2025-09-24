import { Script } from '../scripts'
import injectorUrl from '../../../public/instrumentation.iife.js?url'
import { getAgentIIFE } from '../fingerprint/agent'

type HandleScriptParams = {
  request: Request
  script: Script
  publicApiKey: string
  assets: Fetcher
}

export async function handleScript({ request, script, publicApiKey, assets }: HandleScriptParams) {
  switch (script) {
    case 'instrumentation.iife.js': {
      return assets.fetch(new URL(injectorUrl, request.url))
    }

    case 'agent.iife.js':
      return getAgentIIFE(publicApiKey)
  }
}

import { Script } from '../shared/scripts'

export const scripts: Script[] = ['instrumentor.iife.js', 'loader.js', 'agent-processor.iife.js']

export function getScriptUrl(script: Script, routePrefix: string) {
  return `/${routePrefix}/${script}`
}

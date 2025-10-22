import { TypedEnv } from './types'
import { getRoutePrefix } from './env'
import { Script } from '../shared/scripts'

export const scripts: Script[] = ['instrumentor.iife.js', 'loader.js']

export function validateScript(script: string): asserts script is Script {
  if (!scripts.includes(script as Script)) {
    throw new Error(`Invalid script: ${script}`)
  }
}

export function getScriptUrl(script: Script, env: TypedEnv) {
  return `/${getRoutePrefix(env)}/${script}`
}

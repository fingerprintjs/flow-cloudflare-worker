import { TypedEnv } from './types'
import { getScriptBehaviorPath } from './env'

export type Script = 'instrumentor.iife.js' | 'agent.iife.js'

const scripts: Script[] = ['instrumentor.iife.js', 'agent.iife.js']

export function validateScript(script: string): asserts script is Script {
  if (!scripts.includes(script as Script)) {
    throw new Error(`Invalid script: ${script}`)
  }
}

export function getScriptUrl(script: Script, env: TypedEnv) {
  return `/${getScriptBehaviorPath(env)}/${script}`
}

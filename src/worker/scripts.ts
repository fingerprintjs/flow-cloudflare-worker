import { TypedEnv } from './types'
import { getScriptBehaviorPath } from './env'
import { ProtectedApi } from '../shared/types'
import { PROTECTED_APIS_TEMPLATE } from '../shared/const'

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

export function injectProtectedApis(code: string, protectedApis: ProtectedApi[]) {
  return code.replace(`"${PROTECTED_APIS_TEMPLATE}"`, JSON.stringify(protectedApis))
}

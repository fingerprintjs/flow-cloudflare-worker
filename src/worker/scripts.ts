import { Env } from './types'
import { getScriptBehaviourPath } from './env'

export type Script = 'injector.iife.js'

export function getScriptUrl(script: Script, env: Env) {
  return `/${getScriptBehaviourPath(env)}/${script}`
}

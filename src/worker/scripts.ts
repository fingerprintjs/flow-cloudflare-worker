import { TypedEnv } from './types'
import { getScriptBehaviorPath } from './env'
import { ProtectedApi } from '../shared/types'
import { Script } from '../shared/scripts'

const scripts: Script[] = ['instrumentor.iife.js', 'loader.js']

export function validateScript(script: string): asserts script is Script {
  if (!scripts.includes(script as Script)) {
    throw new Error(`Invalid script: ${script}`)
  }
}

export function getScriptUrl(script: Script, env: TypedEnv) {
  return `/${getScriptBehaviorPath(env)}/${script}`
}

export type ResolveTemplatesParams = {
  code: string
  protectedApis: ProtectedApi[]
  scriptBehaviorPath: string
}

/**
 * Resolves template placeholders in JavaScript code by replacing them with actual values.
 *
 * This function is primarily used to inject runtime configuration into instrumentor code
 * by replacing predefined template strings with their corresponding values. It performs
 * two key replacements:
 * - `"<PROTECTED_APIS>"` (with quotes) is replaced with a JSON stringified array of protected APIs
 * - `<SCRIPT_BEHAVIOR_PATH>` is replaced with the script behavior path string
 *
 * @param {Object} params - The parameters for template resolution
 * @param {string} params.code - The source code containing template placeholders to be resolved
 * @param {string} params.scriptBehaviorPath - The path prefix for scripts that will replace `<SCRIPT_BEHAVIOR_PATH>`
 * @param {ProtectedApi[]} params.protectedApis - Array of protected API configurations that will replace `"<PROTECTED_APIS>"`
 * @returns {string} The processed code with all template placeholders replaced by their actual values
 *
 * @example
 * ```typescript
 * const code = 'const apis = "<PROTECTED_APIS>"; const path = "<SCRIPT_BEHAVIOR_PATH>";';
 * const result = resolveTemplates({
 *   code,
 *   scriptBehaviorPath: '/fingerprint/v1',
 *   protectedApis: [{ name: 'getUserAgent', enabled: true }]
 * });
 * // Result: 'const apis = [{"name":"getUserAgent","enabled":true}]; const path = "/fingerprint/v1";'
 * ```
 *
 * @note The quotes around `<PROTECTED_APIS>` in the template are intentional to ensure
 * the replacement results in valid JavaScript syntax when the array is JSON stringified.
 */
export function resolveTemplates({ code, scriptBehaviorPath, protectedApis }: ResolveTemplatesParams): string {
  return (
    code
      // The " quotes are intentional here to prevent the template from being parsed as a string literal
      .replace('"<PROTECTED_APIS>"', JSON.stringify(protectedApis))
      .replace('<SCRIPT_BEHAVIOR_PATH>', scriptBehaviorPath)
  )
}

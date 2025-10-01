import { Script, validateScript } from './scripts'
import { TypedEnv } from './types'
import { getProtectedApis, getScriptBehaviorPath } from './env'
import { isProtectedUrl } from '../shared/protectedApi'

export type UrlType =
  | {
      type: 'identification'
    }
  | {
      type: 'protection'
    }
  | {
      type: 'script'
      script: Script
    }

export function matchUrl(url: URL, method: string, env: TypedEnv): UrlType | undefined {
  // TODO After url matching library is published, use it here.

  const scriptBehaviourPath = getScriptBehaviorPath(env)
  if (url.pathname.includes(scriptBehaviourPath)) {
    console.info('Matched script behaviour path', url.pathname)

    const script = url.pathname.replace(`/${scriptBehaviourPath}/`, '')
    validateScript(script)
    console.info('Matched script', script)

    return {
      type: 'script',
      script,
    }
  }

  // For now, assume that the root path is the "identification" page
  if (url.pathname === '/') {
    console.info('Matched identification page', url.toString())

    return {
      type: 'identification',
    }
  }

  if (isProtectedUrl({ url: url.toString(), method, protectedApis: getProtectedApis(env) })) {
    console.info('Matched protected url', url.toString())
    return {
      type: 'protection',
    }
  }

  return undefined
}

import { Script, validateScript } from './scripts'
import { Env } from './types'
import { getScriptBehaviourPath } from './env'

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

export function matchUrl(url: URL, env: Env): UrlType | undefined {
  // TODO After url matching library is published, use it here.

  const scriptBehaviourPath = getScriptBehaviourPath(env)
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
    console.info('Matched identification page')

    return {
      type: 'identification',
    }
  }

  return undefined
}

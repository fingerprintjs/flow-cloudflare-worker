import { Script } from './scripts'
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

    const script = url.pathname.replace(`/${scriptBehaviourPath}/`, '') as Script
    console.info('Matched script', script)

    return {
      type: 'script',
      script,
    }
  }

  if (url.pathname === '/') {
    console.info('Matched identification page')

    return {
      type: 'identification',
    }
  }

  return undefined
}

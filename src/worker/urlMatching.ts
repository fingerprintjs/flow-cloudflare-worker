import { validateScript } from './scripts'
import { TypedEnv } from './types'
import { getScriptBehaviorPath } from './env'
import { Script } from '../shared/scripts'

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

export function matchUrl(url: URL, env: TypedEnv): UrlType | undefined {
  // TODO After url matching library is published, use it here.

  const scriptBehaviorPath = getScriptBehaviorPath(env)
  if (url.pathname.includes(scriptBehaviorPath)) {
    console.info('Matched script Behavior path', url.pathname)

    const script = url.pathname.replace(`/${scriptBehaviorPath}/`, '')
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

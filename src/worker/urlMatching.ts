import { validateScript } from './scripts'
import { TypedEnv } from './types'
import { getIdentificationPageUrls, getProtectedApis, getScriptBehaviorPath } from './env'
import { Script } from '../shared/scripts'
import { findMatchingRoute, parseRoutes } from '@fingerprintjs/url-matcher'
import { ProtectedApiHttpMethod } from '../shared/types'

export type UrlType =
  | {
      type: 'identification'
    }
  | {
      type: 'protection'
      method: ProtectedApiHttpMethod
    }
  | {
      type: 'script'
      script: Script
    }

export function matchUrl(url: URL, method: string, env: TypedEnv): UrlType | undefined {
  console.debug('Matching url', url.toString())

  // First, try to match script path
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

  const routes = parseRoutes<UrlType>(
    [
      ...getProtectedApis(env)
        .filter((protectedApi) => protectedApi.method === method)
        .map((protectedApi) => {
          return {
            url: protectedApi.url,
            metadata: {
              type: 'protection' as const,
              method: protectedApi.method,
            },
          }
        }),

      ...getIdentificationPageUrls(env).map((identificationPageUrl) => {
        return {
          url: identificationPageUrl,
          metadata: {
            type: 'identification' as const,
          },
        }
      }),
    ],
    { sortBySpecificity: true }
  )
  console.debug('Created routes', routes)
  const matchedRoute = findMatchingRoute(url, routes)

  if (matchedRoute) {
    return matchedRoute.metadata
  }

  return undefined
}

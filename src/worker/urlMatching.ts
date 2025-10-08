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
          const apiUrl = new URL(protectedApi.url, url.origin)

          return {
            url: apiUrl.toString(),
            metadata: {
              type: 'protection' as const,
              method: protectedApi.method,
            },
          }
        }),

      ...getIdentificationPageUrls(env).map((identificationPath) => {
        const identificationUrl = new URL(identificationPath, url.origin)

        return {
          url: identificationUrl.toString(),
          metadata: {
            type: 'identification' as const,
          },
        }
      }),
    ],
    { sortBySpecificity: true }
  )
  const matchedRoute = findMatchingRoute(url, routes)

  if (matchedRoute) {
    return matchedRoute.metadata
  }

  return undefined
}

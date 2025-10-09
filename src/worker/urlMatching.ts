import { scripts } from './scripts'
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
  | {
      type: 'browserCache'
    }

export function matchUrl(url: URL, method: string, env: TypedEnv): UrlType | undefined {
  console.debug('Matching url', url.toString())

  const scriptBehaviorPath = getScriptBehaviorPath(env)

  const routes = parseRoutes<UrlType>(
    [
      ...scripts.map((script) => {
        return {
          url: new URL(`/${scriptBehaviorPath}/${script}`, url.origin).toString(),
          metadata: {
            type: 'script' as const,
            script,
          },
        }
      }),
      {
        url: new URL(`/${scriptBehaviorPath}/*`, url.origin).toString(),
        metadata: {
          type: 'browserCache' as const,
        },
      },

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

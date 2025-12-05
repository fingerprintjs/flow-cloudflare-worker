import { scripts } from './scripts'
import { TypedEnv } from './types'
import { getIdentificationPageUrls, getProtectedApis, getRoutePrefix } from './env'
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
  | {
      type: 'storeToken'
    }
  | { type: 'api' }

export function matchUrl(url: URL, method: string, env: TypedEnv): UrlType | undefined {
  console.debug('Matching url', url.toString())

  const routePrefix = getRoutePrefix(env)

  const routes = parseRoutes<UrlType>(
    [
      ...scripts.map((script) => {
        return {
          url: new URL(`/${routePrefix}/${script}`, url.origin).toString(),
          metadata: {
            type: 'script' as const,
            script,
          },
        }
      }),
      {
        url: new URL(`/${routePrefix}/store-token`, url.origin).toString(),
        metadata: {
          type: 'storeToken' as const,
        },
      },
      {
        url: new URL(`/${routePrefix}/api/*`, url.origin).toString(),
        metadata: {
          type: 'api' as const,
        },
      },
      {
        url: new URL(`/${routePrefix}/*`, url.origin).toString(),
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
    console.debug('Matched route', matchedRoute)
    return matchedRoute.metadata
  }

  return undefined
}

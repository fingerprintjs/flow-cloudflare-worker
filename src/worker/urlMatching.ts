import { scripts } from './scripts'
import { TypedEnv } from './types'
import { getIdentificationPageUrls, getProtectedApis, getRoutePrefix } from './env'
import { Script } from '../shared/scripts'
import { findMatchingRoute, parseRoutes } from '@fingerprintjs/url-matcher'
import { getCrossOriginUrl } from './utils/request'

export type UrlType =
  | {
      type: 'identification'
    }
  | {
      type: 'protection'
      options: boolean
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
        url: new URL(`/${routePrefix}/*`, url.origin).toString(),
        metadata: {
          type: 'browserCache' as const,
        },
      },

      ...getProtectedApis(env)
        .filter((protectedApi) => protectedApi.method === method || method === 'OPTIONS')
        .map((protectedApi) => {
          return {
            url: protectedApi.url,
            metadata: {
              type: 'protection' as const,
              options: method === 'OPTIONS',
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

/**
 * Checks if the request is a cross-origin request and the origin of the request
 * matches the origin of an identification page (i.e., it is an allowed origin)
 *
 * @returns the allowed origin (protocol://host[:port]); null otherwise, including when the request is a same-origin request
 */
export function getAllowedOrigin(request: Request, typedEnv: TypedEnv): string | null {
  const crossOriginUrl = getCrossOriginUrl(request)
  if (crossOriginUrl) {
    const identificationPageRoutes = parseRoutes(getIdentificationPageUrls(typedEnv)).map((route) => {
      // Convert the identification page URL into a URL that is equivalent to the page's origin
      route.path = '/'
      return route
    })

    const matchedIdentificationPage = findMatchingRoute(crossOriginUrl, identificationPageRoutes)
    if (matchedIdentificationPage) {
      return crossOriginUrl.origin
    }
  }

  return null
}

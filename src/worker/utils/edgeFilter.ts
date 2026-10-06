import { findMatchingRoute, parseRoutes } from '@fingerprintjs/url-matcher'
import { TypedEnv } from '../types'
import { getIdentificationPageUrls, edgeApiAlwaysChecksStaticAssets } from '../env'

/**
 * `Sec-Fetch-Dest` values that browsers send for static asset loads.
 * Requests with these destinations don't call the Edge API by default to avoid unnecessary calls.
 *
 * Not listed, so always sent to the Edge API: `document`, `iframe`, `frame`, `embed`, `object`,
 * `empty` (fetch/XHR), a missing header, and any unknown value.
 *
 * @see https://fetch.spec.whatwg.org/#concept-request-destination
 */
export const STATIC_ASSET_DESTINATIONS: ReadonlySet<string> = new Set([
  'script',
  'style',
  'image',
  'font',
  'audio',
  'video',
  'track',
  'manifest',
  'worker',
  'sharedworker',
  'serviceworker',
  'paintworklet',
  'audioworklet',
  'xslt',
  'report',
  'json',
])

const SKIPPABLE_METHODS = new Set(['GET', 'HEAD'])

/**
 * Returns true when the request is a browser static asset load that should not call the Edge API.
 *
 * The check relies on `Sec-Fetch-Dest`, which clients can forge. A forged value only skips the
 * Edge API call. Client-supplied `fp-*` headers are still stripped before the request reaches the origin.
 *
 * Only applies to requests that matched a wildcard identification page pattern (ending with `*`),
 * where static assets are routed through the worker. Exact patterns always call the Edge API,
 * so customers can list pages explicitly to stop a forged `Sec-Fetch-Dest` from skipping it.
 */
export function shouldSkipEdgeRequest(request: Request, env: TypedEnv): boolean {
  if (edgeApiAlwaysChecksStaticAssets(env)) {
    return false
  }

  if (!SKIPPABLE_METHODS.has(request.method)) {
    return false
  }

  const destination = request.headers.get('Sec-Fetch-Dest')
  if (destination === null || !STATIC_ASSET_DESTINATIONS.has(destination)) {
    return false
  }

  const url = new URL(request.url)

  // Root page with a query string, e.g. a landing page with tracking parameters
  if (url.pathname === '/' && url.search !== '') {
    return false
  }

  if (matchesExactPathIdentificationPage(url, env)) {
    return false
  }

  return true
}

/**
 * Returns true when the URL matches an identification page pattern without a path wildcard.
 * Exact paths win regardless of url-matcher specificity, e.g. `/login` over `/login*`.
 * The caller only handles identification pages, so no exact match means a wildcard matched.
 * The query string is ignored, as url-matcher would otherwise not match `/login?next=` to `/login`.
 */
function matchesExactPathIdentificationPage(url: URL, env: TypedEnv): boolean {
  const exactPathRoutes = parseRoutes(getIdentificationPageUrls(env)).filter((route) => !route.wildcardPathSuffix)
  const urlWithoutQuery = new URL(url)
  urlWithoutQuery.search = ''

  return findMatchingRoute(urlWithoutQuery, exactPathRoutes) !== undefined
}

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
  'speculationrules',
])

const SKIPPABLE_METHODS = new Set(['GET', 'HEAD'])

/**
 * Returns true when the request is a browser static asset load that should not call the Edge API.
 * For example, `https://example.com/assets/app.js`
 *
 * The check relies on `Sec-Fetch-Dest`, which clients can forge.
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Dest
 * A forged value only skips the Edge API call.
 * Client-supplied `fp-*` headers are still stripped before the request reaches the origin.
 *
 * - Only skip non-root GET/HEAD static asset requests that matched a wildcard identification page pattern (ending with `*`),
 * - Requests matching root or exact (no `*`) page patterns always call the Edge API,
 *   so customers can list pages explicitly to stop a forged `Sec-Fetch-Dest` from skipping them.
 *
 * The root page is a special case that intentionally _always_ calls the Edge API because it is usually the first request to a site, and customers
 * commonly use a pattern like `https://example.com/*` which matches it.
 */
export function shouldSkipEdgeRequest(request: Request, env: TypedEnv): boolean {
  if (edgeApiAlwaysChecksStaticAssets(env)) {
    return false
  }

  const url = new URL(request.url)

  return (
    SKIPPABLE_METHODS.has(request.method) &&
    isStaticAssetDestination(request.headers.get('Sec-Fetch-Dest')) &&
    url.pathname !== '/' &&
    onlyMatchesWildcardIdentificationPage(url, env)
  )
}

function isStaticAssetDestination(destination: string | null): boolean {
  return destination !== null && STATIC_ASSET_DESTINATIONS.has(destination)
}

/**
 * Returns true when the URL matches no identification page pattern without a path wildcard.
 * The caller only handles identification pages, so no exact match means only a wildcard matched.
 * Exact paths win regardless of url-matcher specificity, e.g. `/login` over `/login*`.
 * The query string is ignored, as url-matcher would otherwise not match `/login?next=` to `/login`.
 */
function onlyMatchesWildcardIdentificationPage(url: URL, env: TypedEnv): boolean {
  const exactPathRoutes = parseRoutes(getIdentificationPageUrls(env)).filter((route) => !route.wildcardPathSuffix)
  const urlWithoutQuery = new URL(url)
  urlWithoutQuery.search = ''

  return findMatchingRoute(urlWithoutQuery, exactPathRoutes) === undefined
}

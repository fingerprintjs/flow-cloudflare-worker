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
 * - Only skip GET/HEAD static asset requests that matched a wildcard identification page pattern (ending with `*`),
 * - Requests matching exact (no `*`) page patterns always call the Edge API,
 *   so customers can list pages explicitly to stop a forged `Sec-Fetch-Dest` from skipping them.
 *
 * A wildcard pattern's base path, e.g. `/base/` for `https://example.com/base/*`, intentionally _always_ calls the Edge API.
 * It is usually the page itself, e.g. the root page for `https://example.com/*`, which is often the first request to a site.
 */
export function shouldSkipEdgeRequest(request: Request, env: TypedEnv): boolean {
  if (edgeApiAlwaysChecksStaticAssets(env)) {
    return false
  }

  const url = new URL(request.url)

  return (
    SKIPPABLE_METHODS.has(request.method) &&
    isStaticAssetDestination(request.headers.get('Sec-Fetch-Dest')) &&
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
 * A wildcard pattern's base path counts as exact, e.g. `/base/` for `/base/*` and `/` for `/*`.
 * The query string is ignored, as url-matcher would otherwise not match `/login?next=` to `/login`.
 */
function onlyMatchesWildcardIdentificationPage(url: URL, env: TypedEnv): boolean {
  const exactPathRoutes = parseRoutes(getIdentificationPageUrls(env)).map((route) => ({
    ...route,
    wildcardPathSuffix: false,
  }))
  const urlWithoutQuery = new URL(url)
  urlWithoutQuery.search = ''

  return findMatchingRoute(urlWithoutQuery, exactPathRoutes) === undefined
}

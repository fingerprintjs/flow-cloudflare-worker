import { Route } from '@fingerprintjs/url-matcher'
import { TypedEnv } from '../types'
import { edgeApiAlwaysChecksStaticAssets } from '../env'

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
 * Only skips GET/HEAD static asset requests whose path differs from the matched route's path.
 * That only happens under a wildcard pattern (ending with `*`), excluding its base path,
 * e.g. `/base/` for `https://example.com/base/*` and `/` for `https://example.com/*`.
 *
 * Other identification pages do not affect this. Exact `https://example.com/page` next to
 * `https://example.com/*` does not force Edge on `/page?q=` because Cloudflare matching
 * gives the wildcard the request. Add `https://example.com/page*` so that pattern wins.
 * That covers `/page` and `/page?q=`, not `/page/foo` or `/page-old`.
 *
 * @param route - The identification page route that matched the request.
 */
export function shouldSkipEdgeRequest(request: Request, env: TypedEnv, route: Route<unknown>): boolean {
  if (edgeApiAlwaysChecksStaticAssets(env)) {
    return false
  }

  const url = new URL(request.url)

  return (
    SKIPPABLE_METHODS.has(request.method) &&
    isStaticAssetDestination(request.headers.get('Sec-Fetch-Dest')) &&
    url.pathname !== route.path
  )
}

function isStaticAssetDestination(destination: string | null): boolean {
  return destination !== null && STATIC_ASSET_DESTINATIONS.has(destination)
}

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
 * True for a static asset that should not call the Edge API.
 *
 * A static asset is a GET/HEAD identification-page request whose `Sec-Fetch-Dest` is
 * `script`, `style`, `image`, `font`, and similar.
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Dest
 *
 * Clients can forge that header. Edge always runs when the request path is the matched
 * identification pattern's path (`route.path`). For `https://example.com/*` that is `/`
 * and `/?q=1`. To cover another page including `?q=`, add `https://example.com/checkout*`.
 * Fragments are not sent to the worker.
 *
 * A forged dest only skips the Edge call. Client-supplied `fp-*` headers are still stripped.
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

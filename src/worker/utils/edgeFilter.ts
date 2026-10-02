import { TypedEnv } from '../types'
import { isEdgeStaticAssetSkipEnabled } from '../env'

/**
 * `Sec-Fetch-Dest` values that browsers send for static asset loads.
 * Requests with these destinations don't call the Edge API.
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
 */
export function shouldSkipEdgeRequest(request: Request, env: TypedEnv): boolean {
  if (!isEdgeStaticAssetSkipEnabled(env)) {
    return false
  }

  if (!SKIPPABLE_METHODS.has(request.method)) {
    return false
  }

  const destination = request.headers.get('Sec-Fetch-Dest')

  return destination !== null && STATIC_ASSET_DESTINATIONS.has(destination)
}

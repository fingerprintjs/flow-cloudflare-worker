export type CacheOptions = {
  // maxAge typically represents private cache, such as browser
  maxAge: number
  // sMaxAge typically represents shared cache, such as CDN
  sMaxAge: number
}

const cacheDisabled = import.meta.env.VITE_CACHE_DISABLED === 'true'
if (cacheDisabled) {
  console.warn('Cache is disabled')
}

/**
 * Fetches a resource while applying a cacheable mechanism with a specified TTL (time-to-live).
 *
 * @param {Request<unknown, IncomingRequestCfProperties>} request - The request object containing the resource to fetch and properties related to the Cloudflare environment.
 * @param {number} ttl - The time-to-live (TTL) value for the cacheable mechanism.
 * @return {Promise<Response>} A promise that resolves to a Response object.
 */
export async function fetchCacheable(
  request: Request<unknown, IncomingRequestCfProperties>,
  ttl: number
): Promise<Response> {
  if (cacheDisabled) {
    return fetch(request)
  }

  return fetch(request, { cf: { cacheTtl: ttl } })
}

/**
 * Ensures that the specified cache directive in the directives list does not exceed a given maximum value.
 * If the directive is not present in the list, it is added with the maximum value specified.
 * If the directive is already present and its value exceeds the specified maximum, it is updated to the maximum value.
 *
 * @param {string[]} directives - The list of cache directive strings to inspect and modify.
 * @param {'max-age' | 's-maxage'} directive - The cache directive type to search for and enforce a maximum value.
 * @param {number} maxMaxAge - The maximum allowed value for the specified directive.
 */
function ensureMaxCacheDirectiveValue(directives: string[], directive: 'max-age' | 's-maxage', maxMaxAge: number) {
  const directiveIndex = directives.findIndex(
    (directivePair) => directivePair.split('=')[0].trim().toLowerCase() === directive
  )
  if (directiveIndex === -1) {
    directives.push(`${directive}=${maxMaxAge}`)
  } else {
    const oldValue = Number(directives[directiveIndex].split('=')[1])
    const newValue = Math.min(maxMaxAge, oldValue)
    directives[directiveIndex] = `${directive}=${newValue}`
  }
}

/**
 * Ensures that the cache-control header contains the specified maximum age values for 'max-age' and 's-maxage' directives.
 * If these values exceed the given maximums, they are updated accordingly.
 *
 * @param {string} cacheControlHeaderValue - The existing value of the cache-control header.
 * @param {Object} param - Configuration options for controlling cache directive values.
 * @param {number} [param.sMaxAge] - The maximum allowed value for the 's-maxage' directive.
 * @param {number} [param.maxAge] - The maximum allowed value for the 'max-age' directive.
 * @return {string} - The updated cache-control header value with updated or unchanged directive values.
 */
function ensureCacheControlMaxAge(cacheControlHeaderValue: string, { sMaxAge, maxAge }: CacheOptions): string {
  const cacheControlDirectives = cacheControlHeaderValue.split(', ')

  ensureMaxCacheDirectiveValue(cacheControlDirectives, 'max-age', maxAge)
  ensureMaxCacheDirectiveValue(cacheControlDirectives, 's-maxage', sMaxAge)

  return cacheControlDirectives.join(', ')
}

/**
 * Creates a new `Response` object with an updated `cache-control` header. If the original response does not
 * have a `cache-control` header, this method handles the behavior based on the value of `ifNoCacheControlBehavior`.
 *
 * @param {Response} oldResponse - The original response object whose `cache-control` header may be modified.
 * @param {'skip'|'set'} [ifNoCacheControlBehavior='skip'] - Determines behavior when the original response lacks a `cache-control` header.
 *    - `'skip'`: Returns the response without adding a `cache-control` header.
 *    - `'set'`: Sets a default `cache-control` header with pre-defined `max-age` and `s-maxage` values.
 * @param {CacheOptions} cacheOptions - The cache options object.
 * @return {Response} A new `Response` instance with the updated `cache-control` header or the original behavior based on the inputs.
 */
export function createResponseWithMaxAge(
  oldResponse: Response,
  cacheOptions: CacheOptions,
  ifNoCacheControlBehavior: 'skip' | 'set' = 'skip'
): Response {
  if (cacheDisabled) {
    return oldResponse
  }

  const response = new Response(oldResponse.body, oldResponse)
  const oldCacheControlHeader = oldResponse.headers.get('cache-control')
  if (!oldCacheControlHeader) {
    if (ifNoCacheControlBehavior === 'skip') {
      return response
    }
    response.headers.set('cache-control', `max-age=${cacheOptions.maxAge}, s-maxage=${cacheOptions.sMaxAge}`)

    return response
  }

  const cacheControlHeader = ensureCacheControlMaxAge(oldCacheControlHeader, cacheOptions)
  response.headers.set('cache-control', cacheControlHeader)
  return response
}

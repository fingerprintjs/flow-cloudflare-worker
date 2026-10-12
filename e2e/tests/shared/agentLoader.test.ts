import { expect } from '@playwright/test'
import { WORKER_ROUTE_PREFIX } from '../../utils/config'
import { test } from '../playwright'
import { assertIsDefined } from './utils'

test.describe('Agent loader', () => {
  // Exact header values come from the CDN and vary, so the runtime tests cover passthrough.
  test('should support browser revalidation with ETag', async ({ request }) => {
    const loaderPath = `/${WORKER_ROUTE_PREFIX}/loader.js`

    const response = await request.get(loaderPath)
    expect(response.status()).toBe(200)

    const etag = response.headers()['etag']
    assertIsDefined(etag, 'etag')
    expect(response.headers()['cache-control']).toMatch(/max-age=\d+/)
    // Fingerprint CDN never sends `s-maxage`, and proxies must not add it.
    expect(response.headers()['cache-control']).not.toContain('s-maxage')

    const revalidation = await request.get(loaderPath, {
      headers: { 'If-None-Match': etag },
    })
    expect(revalidation.status()).toBe(304)
    expect(revalidation.headers()['cache-control'] ?? '').not.toContain('s-maxage')
    // The CDN returns the strong form of a weak ETag on 304, so compare without the `W/` prefix.
    expect(revalidation.headers()['etag']?.replace(/^W\//, '')).toEqual(etag.replace(/^W\//, ''))
  })
})

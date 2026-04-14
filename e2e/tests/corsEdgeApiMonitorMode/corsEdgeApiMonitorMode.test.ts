import { corsEdgeApiMonitorModeTest as test } from '../../utils/playwright'
import { expect } from '@playwright/test'
import { assertIsDefined } from '../shared/utils'
import { edgeHeaders } from '../../utils/edge'

test.describe('CORS with ruleset that blocks', () => {
  test('should return response with Edge headers for instrumentation page', async ({ page }) => {
    const response = await page.goto('/')
    assertIsDefined(response)

    for (const edgeHeadersKey of edgeHeaders) {
      expect(response.headers()[edgeHeadersKey]).toBeDefined()
    }
  })

  test('should return response with Edge headers for protected API', async ({ page, corsUrl }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    const protectedPath = new URL('/api/test', corsUrl).toString()

    // Trigger the fetch
    await page.evaluate(async (url) => {
      try {
        await fetch(url, { method: 'POST' })
      } catch (error) {
        // Ignore fetch errors - the request may still be recorded
      }
    }, protectedPath)

    const protectedRequest = await page
      .requests()
      .then((requests) => requests.find((request) => request.url().includes(protectedPath)))
    assertIsDefined(protectedRequest)

    const protectedResponse = await protectedRequest.response()
    assertIsDefined(protectedResponse)

    for (const edgeHeadersKey of edgeHeaders) {
      expect(protectedResponse.headers()[edgeHeadersKey]).toBeDefined()
    }
  })
})

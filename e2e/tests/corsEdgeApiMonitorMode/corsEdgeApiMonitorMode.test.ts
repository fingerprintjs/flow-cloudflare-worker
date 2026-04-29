import { corsEdgeApiMonitorModeTest as test } from '../../utils/playwright'
import { assertIsDefined } from '../shared/utils'
import { checkEdgeNoBotHeaders } from '../../utils/edge'

test.describe('CORS with Edge API in monitor mode', () => {
  test('should return response with Edge headers for instrumentation page', async ({ page }) => {
    const response = await page.goto('/')
    assertIsDefined(response)

    checkEdgeNoBotHeaders(response)
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

    checkEdgeNoBotHeaders(protectedResponse)
  })
})

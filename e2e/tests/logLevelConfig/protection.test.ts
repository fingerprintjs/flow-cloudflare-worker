import { expect, test } from '@playwright/test'
import { getProtectedPath } from '../../utils/config'
import { SIGNALS_KEY } from '../../../src/shared/const'
import { assertIsDefined } from '../shared/utils'

test.describe('Protection', () => {
  test('should log messages', async ({ page }) => {
    const instrumentorConsoleMessages: string[] = []
    page.on('console', (msg) => {
      const rawMessageUrl = msg.location().url
      if (rawMessageUrl) {
        const sourceUrl = new URL(rawMessageUrl)
        if (sourceUrl.pathname.endsWith('/instrumentor.iife.js')) {
          instrumentorConsoleMessages.push(msg.text())
        }
      }
    })

    await page.goto('/', { waitUntil: 'networkidle' })

    const protectedRequestPath = getProtectedPath('/test', 'log-level-config')

    await page.route(protectedRequestPath, (route, request) => {
      const headers = {
        ...request.headers(),
      }
      // Delete signals from the request to protected page
      delete headers[SIGNALS_KEY]

      route.continue({ headers })
    })

    await page.evaluate(async (url) => {
      await fetch(url, { method: 'POST' })
    }, protectedRequestPath)

    let request = await page
      .requests()
      .then((requests) => requests.find((request) => request.url().includes(protectedRequestPath)))
    expect(request).toBeDefined()
    request = request!

    let response = await request.response()
    expect(response).toBeDefined()
    response = response!

    expect(response.status()).toEqual(403)
    expect(response.body()).rejects.toThrow('No data found for resource with given identifier')

    const protectedRequest = await page
      .requests()
      .then((requests) => requests.find((request) => request.url().includes(protectedRequestPath)))
    assertIsDefined(protectedRequest)
    expect(protectedRequest.headers()[SIGNALS_KEY]).toBeUndefined()

    // The instrumentor should have produced debug messages given the Flow worker configuration
    expect(instrumentorConsoleMessages.length).toBeGreaterThan(0)
  })
})

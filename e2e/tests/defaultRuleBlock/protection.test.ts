import { expect, test } from '@playwright/test'
import { getProtectedPath } from '../../utils/config'
import { SIGNALS_KEY } from '../../../src/shared/const'

test.describe('Protection', () => {
  test('should return empty 403 response if signals are missing', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    const protectedRequestPath = getProtectedPath('/test', 'default-rule-block')

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

    const request = await page
      .requests()
      .then((requests) => requests.find((request) => request.url().includes(protectedRequestPath)))
    expect(request).toBeDefined()

    const response = await request!.response()

    expect(response!.status()).toEqual(403)
    expect(response!.body()).rejects.toThrow('No data found for resource with given identifier')

    const protectedRequest = await page
      .requests()
      .then((requests) => requests.find((request) => request.url().includes(protectedRequestPath)))
    expect(protectedRequest).toBeDefined()
    expect(protectedRequest!.headers()[SIGNALS_KEY]).toBeUndefined()
  })
})

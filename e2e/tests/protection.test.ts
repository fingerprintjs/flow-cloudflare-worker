import { expect, test } from '@playwright/test'
import { getProtectedPath } from '../utils/config'
import { SIGNALS_KEY } from '../../src/shared/const'

test.describe('Protection', () => {
  test('should return empty 403 response if signals are missing', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.route(getProtectedPath('/test'), (route, request) => {
      const headers = {
        ...request.headers(),
      }
      // Delete signals from the request to protected page
      delete headers[SIGNALS_KEY]

      route.continue({ headers })
    })

    const { status, body } = await page.evaluate(async (url) => {
      const response = await fetch(url, { method: 'POST' })
      return {
        status: response.status,
        body: await response.text(),
      }
    }, getProtectedPath('/test'))

    expect(status).toEqual(403)
    expect(body).toEqual('')

    const protectedRequest = await page
      .requests()
      .then((requests) => requests.find((request) => request.url().includes(getProtectedPath('/test'))))
    expect(protectedRequest).toBeDefined()
    expect(protectedRequest!.headers()[SIGNALS_KEY]).toBeUndefined()
  })

  test('should inject signals when protected page is requested', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    const { status, body } = await page.evaluate(async (url) => {
      const response = await fetch(url, { method: 'POST' })
      return {
        status: response.status,
        body: await response.text(),
      }
    }, getProtectedPath('/test'))

    expect(status).toEqual(403)
    expect(body).toEqual('')

    const protectedRequest = await page
      .requests()
      .then((requests) => requests.find((request) => request.url().includes(getProtectedPath('/test'))))
    expect(protectedRequest).toBeDefined()
    expect(protectedRequest!.headers()[SIGNALS_KEY]).toBeTruthy()
  })
})

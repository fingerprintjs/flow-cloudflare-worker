import { test, expect } from '@playwright/test'
import { getProtectedPath } from '../utils/config'

test.describe('Protection', () => {
  test('should return 403 if signals are missing', async ({ page }) => {
    await page.goto('/')

    // On the actual page, send a fetch request to the protected endpoint
    const { status, body } = await page.evaluate(async (url) => {
      const response = await fetch(url, { method: 'POST' })
      return {
        status: response.status,
        body: await response.text(),
      }
    }, getProtectedPath('/test'))

    expect(status).toEqual(403)
    expect(body).toEqual('')
  })
})

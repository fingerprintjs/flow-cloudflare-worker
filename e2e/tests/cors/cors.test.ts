import { corsTest as test } from './playwright'
import { expect } from '@playwright/test'

test.describe('CORS', () => {
  test('should handle CORS requests correctly', async ({ page, corsUrl }) => {
    await page.goto('/', {
      waitUntil: 'networkidle',
    })

    const corsRequestUrl = new URL('/api/test', corsUrl)

    await page.evaluate(async (url) => {
      await fetch(url, { method: 'POST' })
    }, corsRequestUrl.toString())

    const requests = await page.requests()
    let request = requests.find((request) => request.url().includes(corsRequestUrl.toString()))
    expect(request).toBeDefined()
    request = request!

    let response = await request.response()
    expect(response).toBeDefined()
    response = response!

    expect(response.status()).toEqual(200)
  })
})

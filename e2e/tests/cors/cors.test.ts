import { corsTest as test } from './playwright'
import { expect } from '@playwright/test'
import { SIGNALS_KEY } from '../../../src/shared/const'

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
    expect(request.headers()[SIGNALS_KEY]).toBeTruthy()
    expect(request.headers()[SIGNALS_KEY]?.startsWith('_')).toBeFalsy()

    let response = await request.response()
    expect(response).toBeDefined()
    response = response!

    expect(response.status()).toEqual(200)
  })

  test('should include "_" in signals if request included credentials', async ({ page, corsUrl }) => {
    await page.goto('/', {
      waitUntil: 'networkidle',
    })

    const corsRequestUrl = new URL('/api/test', corsUrl)

    await page.evaluate(async (url) => {
      await fetch(url, { method: 'POST', credentials: 'include' })
    }, corsRequestUrl.toString())

    const requests = await page.requests()
    let request = requests.find((request) => request.url().includes(corsRequestUrl.toString()))
    expect(request).toBeDefined()
    request = request!
    expect(request.headers()[SIGNALS_KEY]?.startsWith('_')).toBeTruthy()

    let response = await request.response()
    expect(response).toBeDefined()
    response = response!

    expect(response.status()).toEqual(200)
  })
})

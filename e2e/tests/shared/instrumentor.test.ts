import { expect } from '@playwright/test'
import { getProtectedPath, WORKER_ROUTE_PREFIX } from '../../utils/config'
import { test } from '../playwright'

test.describe('Instrumentor script', () => {
  test('should be injected into specified pages', async ({ page, project }) => {
    await page.goto('/')

    const requests = await page.requests()
    const instrumentorRequest = requests.find((request) => request.url().includes('instrumentor'))

    expect(instrumentorRequest).toBeDefined()
    expect(instrumentorRequest!.url()).toContain('instrumentor.iife.js')

    const response = await instrumentorRequest!.response()
    expect(response).toBeTruthy()
    expect(response!.status()).toBe(200)

    const responseHeaders = response!.headers()
    expect(responseHeaders['content-type']).toEqual('application/javascript')
    expect(responseHeaders['cache-control']).toEqual('max-age=60, s-maxage=60')

    const instrumentorCode = await response!.text()
    expect(instrumentorCode).toContain(WORKER_ROUTE_PREFIX)
    expect(instrumentorCode).toContain(getProtectedPath('/*', project.project))
  })

  test('should not be injected into not configured pages', async ({ page }) => {
    await page.goto('/not-configured')

    const requests = await page.requests()
    const instrumentorRequest = requests.find((request) => request.url().includes('instrumentor'))

    expect(instrumentorRequest).toBeUndefined()
  })
})

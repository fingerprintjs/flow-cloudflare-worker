import { expect } from '@playwright/test'
import { SIGNALS_KEY } from '../../../src/shared/const'
import { test } from '../playwright'
import { assertIsDefined } from '../shared/utils'
import { getTestHost } from '../../utils/env'

test.describe('Protection', () => {
  test('should inject signals when protected API with wildcard subdomain and wildcard path is called', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // Create a subdomain that should match the wildcard pattern
    // The PROTECTED_APIS is configured as https://*.{test-host}/api/*
    // So a request to https://api-wildcard.{test-host}/api/test should match
    const apiSubdomainHost = getTestHost('api-wildcard')
    const protectedApiUrl = `https://${apiSubdomainHost}/api/test`

    // Set up request listener before triggering the fetch
    const requestPromise = page.waitForRequest(
      (request) => request.url().includes(protectedApiUrl) && request.method() === 'POST'
    )

    // Trigger the fetch - catch errors since we're testing request headers, not response
    await page.evaluate(async (url) => {
      try {
        await fetch(url, { method: 'POST' })
      } catch (error) {
        // Ignore fetch errors - the request may still be recorded
        // and we're testing the request headers, not the response
      }
    }, protectedApiUrl)

    // Wait for the request to be recorded by Playwright
    const protectedRequest = await requestPromise
    assertIsDefined(protectedRequest)
    // This assertion should fail due to the bug - signals are not injected
    // when protected API has both wildcard subdomain and wildcard path
    expect(protectedRequest.headers()[SIGNALS_KEY]).toBeTruthy()
  })
})

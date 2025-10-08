import { beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../../../src/worker'
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test'
import { CloudflareRequest } from '../request'
import { mockEnv } from '../../utils/mockEnv'

const sampleHtml = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Document</title>
</head>
<body>
  <div>Test website</div>
</body>
</html>
`

describe('Scripts injection', () => {
  vi.spyOn(globalThis, 'fetch')

  beforeEach(() => {
    vi.clearAllMocks()

    Object.assign(env, mockEnv)
  })

  it('should inject scripts on request to identification page', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(sampleHtml, {
        headers: {
          'Content-Type': 'text/html',
        },
        status: 200,
      })
    )

    const request = new CloudflareRequest('https://example.com/')
    const ctx = createExecutionContext()

    const response = await handler.fetch(request, mockEnv)
    await waitOnExecutionContext(ctx)
    const html = await response.text()

    expect(html).toContain('<script defer src="/scripts/instrumentor.iife.js"></script>')
  })

  it('should return normal response on page with broken HTML', async () => {
    const brokenHtml = `
    <!doctype html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    `
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(brokenHtml, {
        headers: {
          'Content-Type': 'text/html+maybe; charset=utf-16',
        },
        status: 200,
      })
    )

    const request = new CloudflareRequest('https://example.com/')
    const ctx = createExecutionContext()

    const response = await handler.fetch(request, mockEnv)
    await waitOnExecutionContext(ctx)
    const html = await response.text()

    expect(html).toEqual(brokenHtml)
  })
})

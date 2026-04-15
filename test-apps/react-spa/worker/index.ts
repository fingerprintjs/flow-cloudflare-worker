import { getCorsHeaders, handleOptions, isCorsSupported } from './cors.ts'

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS' && isCorsSupported(env)) {
      return handleOptions(request, env)
    }

    const url = new URL(request.url)

    console.debug('url', url.toString())

    const receivedHeaders = Array.from(request.headers.entries()).map(([name, value]) => ({
      name,
      value,
    }))

    // Serve root-level static files (favicon.ico, robots.txt) directly.
    // Hashed assets under /assets/* skip the Worker entirely via run_worker_first.
    if (url.pathname.match(/\.\w+$/) && !url.pathname.endsWith('.html')) {
      console.debug('Serving static file', url.pathname)
      return env.ASSETS.fetch(request)
    }

    if (url.pathname.startsWith('/api/')) {
      const headers: Headers = new Headers()

      if (receivedHeaders.length > 0) {
        headers.set('x-received-headers', JSON.stringify(receivedHeaders))
      }

      if (isCorsSupported(env)) {
        headers.set('Access-Control-Allow-Origin', getCorsHeaders(env)['Access-Control-Allow-Origin'])
      }

      return Response.json(
        {
          name: 'Cloudflare',
        },
        { headers }
      )
    }

    console.debug(`Fetching HTML for ${url.pathname}`)

    // Fetch the SPA html from static assets (co-located, sub-millisecond).
    const htmlResponse = await env.ASSETS.fetch(request)

    const responseHeaders = new Headers(htmlResponse.headers)
    responseHeaders.set('x-received-headers', JSON.stringify(receivedHeaders))

    return new Response(htmlResponse.body, {
      status: htmlResponse.status,
      headers: responseHeaders,
      statusText: htmlResponse.statusText,
      cf: htmlResponse.cf,
    })
  },
} satisfies ExportedHandler<Env>

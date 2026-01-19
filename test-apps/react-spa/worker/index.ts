import { getCorsHeaders, handleOptions, isCorsSupported } from './cors.ts'

export default {
  fetch(request, env) {
    if (request.method === 'OPTIONS' && isCorsSupported(env)) {
      return handleOptions(request, env)
    }

    const url = new URL(request.url)
    let receivedHeaders: Array<{ name: string; value: string }> = []

    if (url.pathname === '/api/test') {
      receivedHeaders = Array.from(request.headers.entries()).map(([name, value]) => ({
        name,
        value,
      }))
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

    return new Response(null, { status: 404 })
  },
} satisfies ExportedHandler<Env>

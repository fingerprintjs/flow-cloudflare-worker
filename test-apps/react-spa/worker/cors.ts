const allowedMethods = 'GET,HEAD,POST,PUT,PATCH,OPTIONS'

export function getCorsHeaders(env: Env) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': env.CORS_ALLOWED_ORIGINS,
    'Access-Control-Allow-Methods': allowedMethods,
    'Access-Control-Max-Age': '86400',
  }

  if (typeof env.CORS_ALLOW_CREDENTIALS === 'boolean') {
    headers['Access-Control-Allow-Credentials'] = env.CORS_ALLOW_CREDENTIALS
  }

  return headers
}

export async function handleOptions(request: Request, env: Env) {
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS preflight requests.
    return new Response(null, {
      headers: {
        ...getCorsHeaders(env),
        'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers')!,
      },
    })
  }
  // Handle standard OPTIONS request.
  return new Response(null, {
    headers: {
      Allow: allowedMethods,
    },
  })
}

export function isCorsSupported(env: Env) {
  return Boolean(env.CORS_ALLOWED_ORIGINS)
}

const PROTECTED_API_HTTP_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH', 'GET', 'HEAD'] as const

export type ProtectedApiHttpMethod = (typeof PROTECTED_API_HTTP_METHODS)[number]

export function isProtectedApiHttpMethod(method: string): method is ProtectedApiHttpMethod {
  // @ts-expect-error - We need to check if the method is a protected API HTTP method
  return PROTECTED_API_HTTP_METHODS.includes(method)
}

export type ProtectedApi = {
  method: ProtectedApiHttpMethod
  url: string
}

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const

export type LogLevel = (typeof LOG_LEVELS)[number]

export function isLogLevel(level: string): level is LogLevel {
  // @ts-expect-error - We need to check if the level is valid
  return LOG_LEVELS.includes(level)
}

export interface Logger {
  debug: typeof console.debug
  info: typeof console.info
  warn: typeof console.warn
  error: typeof console.error
}

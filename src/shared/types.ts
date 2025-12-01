const PROTECTED_API_HTTP_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH', 'GET', 'HEAD', 'OPTIONS'] as const

export type ProtectedApiHttpMethod = (typeof PROTECTED_API_HTTP_METHODS)[number]

export function isProtectedApiHttpMethod(method: string): method is ProtectedApiHttpMethod {
  // @ts-expect-error - We need to check if the method is a protected API HTTP method
  return PROTECTED_API_HTTP_METHODS.includes(method)
}

export type ProtectedApi = {
  method: ProtectedApiHttpMethod
  url: string
}

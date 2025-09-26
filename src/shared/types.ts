export type ProtectedApiHttpMethod = 'POST' // Only POST is supported for now

export type ProtectedApi = {
  method: ProtectedApiHttpMethod
  url: string
  ruleSetId: string
}

export function isValidHttpMethod(method: string): method is ProtectedApiHttpMethod {
  return method === 'POST'
}

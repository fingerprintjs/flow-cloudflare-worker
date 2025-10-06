export type ProtectedApiHttpMethod = 'POST' // Only POST is supported for now

export type ProtectedApi = {
  method: ProtectedApiHttpMethod
  url: string
}

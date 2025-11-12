export type ProtectedApiHttpMethod = 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'GET' | 'HEAD' | 'OPTIONS'

export type ProtectedApi = {
  method: ProtectedApiHttpMethod
  url: string
}

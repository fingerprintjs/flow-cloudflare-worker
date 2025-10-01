export type TypedEnv = Omit<Env, 'PROTECTED_APIS'> & {
  PROTECTED_APIS: ProtectedApi[]
}

export type ProtectedApi = {
  method: 'POST' // Only POST is supported for now
  url: string
}

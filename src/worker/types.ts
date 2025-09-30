import { ProtectedApi } from '../shared/types'

export type TypedEnv = Omit<Env, 'PROTECTED_APIS'> & {
  PROTECTED_APIS: ProtectedApi[]
}
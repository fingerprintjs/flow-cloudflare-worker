import { ProtectedApi } from '../shared/types'
import { RuleActionUnion } from './fingerprint/ruleset'

export type TypedEnv = Omit<Env, 'PROTECTED_APIS' | 'FP_FAILURE_FALLBACK_ACTION'> & {
  PROTECTED_APIS: ProtectedApi[]
  FP_FAILURE_FALLBACK_ACTION?: RuleActionUnion
}

import { LogLevel, ProtectedApi } from '../shared/types'
import { RuleActionUnion } from './fingerprint/ruleset'

export type TypedEnv = Omit<Env, 'PROTECTED_APIS' | 'FP_FAILURE_FALLBACK_ACTION' | 'FP_LOG_LEVEL'> & {
  PROTECTED_APIS: ProtectedApi[]
  FP_FAILURE_FALLBACK_ACTION?: RuleActionUnion
  FP_LOG_LEVEL?: LogLevel
}

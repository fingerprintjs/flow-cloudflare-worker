/**
 * Business context for Rules Engine, injected as top-level `/v4/send` fields.
 *
 * Counterfactual spike assumption: POST /v4/send accepts `tag` and `linked_id`.
 */
export type BusinessContext = {
  /** Same semantics as JS agent / event tags */
  tag?: unknown
  /** Customer linked id */
  linkedId?: string
}

/**
 * Partial values from a single source (body or headers).
 * Fields may be absent when that source does not provide them.
 */
export type BusinessContextSource = {
  tag?: unknown
  linkedId?: string
}

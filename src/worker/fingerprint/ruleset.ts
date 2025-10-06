import { fetchOrigin } from '../utils/origin'

/**
 * Represents an HTTP header with name and value.
 */
type RuleHeader = { name: string; value: string }

/**
 * Represents an 'allow' rule action that permits a request to proceed
 * with optional header modifications.
 */
export type AllowAction = {
  /** Action type identifier */
  type: 'allow'
  /** Optional request header modifications to apply */
  request_header_modifications?: {
    /** Headers to remove from the request */
    remove?: string[]
    /** Headers to set/replace in the request */
    set?: RuleHeader[]
    /** Headers to append to the request */
    append?: RuleHeader[]
  }
}

/**
 * Represents a 'block' rule action that blocks a request
 * and returns a custom response.
 */
export type BlockAction = {
  /** Action type identifier */
  type: 'block'
  /** HTTP status code to return */
  status_code: number
  /** Response headers to include */
  headers: RuleHeader[]
  /** Response body content */
  body: string
}

/**
 * Represents a rule action from a ingress response.
 * Contains either an 'allow' or 'block' action along with rule metadata.
 */
export type RuleAction = (AllowAction | BlockAction) & {
  /** The ID of the evaluated ruleset */
  ruleset_id: string
  /** The ID of the rule that generated the action */
  rule_id: string
  /** The expression of the rule that generated the action */
  rule_expression: string
}

/**
 * A function type that processes HTTP request based on rule actions.
 * Takes a request and returns a promise that resolves to an HTTP response.
 */
export type RulesetProcessor = (request: Request) => Promise<Response>

/**
 * Creates a ruleset processor function based on the provided rule action.
 *
 * The processor handles different action types:
 * - 'block': Returns a blocking response with custom status and headers
 * - 'allow': Modifies request headers and forwards to origin
 * - default: Forwards request to origin without modifications
 *
 * @param ruleAction - The rule action configuration to process
 * @returns A processor function that handles HTTP requests according to the rule action
 */
export const makeRulesetProcessor = (ruleAction: RuleAction): RulesetProcessor => {
  return async (request) => {
    switch (ruleAction.type) {
      case 'block':
        return handleBlock(ruleAction)

      case 'allow':
        return handleAllow(request, ruleAction)

      default:
        console.warn('Invalid rule type:', ruleAction)
        return fetchOrigin(request)
    }
  }
}

/**
 * Creates a Headers object from an array of RuleHeader objects.
 *
 * @param headers - Array of header name-value pairs to convert
 * @returns A new Headers object containing all the provided headers
 */
function createHeaders(headers: RuleHeader[]) {
  const result = new Headers()

  headers.forEach(({ name, value }) => {
    result.set(name, value)
  })

  return result
}

/**
 * Handles a 'block' action by creating a blocking response.
 *
 * @param action - The block action configuration containing status code, headers, and body
 * @returns A Response object that blocks the request with the specified configuration
 */
function handleBlock(action: BlockAction) {
  return new Response(action.body, {
    headers: createHeaders(action.headers),
    status: action.status_code,
  })
}

/**
 * Handles an 'allow' action by modifying request headers and forwarding to origin.
 *
 * Creates a clone of the original request and applies header modifications
 * (remove, set, append) before forwarding the request to the origin server.
 *
 * @param request - The original HTTP request
 * @param action - The allow action configuration with optional header modifications
 * @returns A Promise that resolves to the origin server's response
 */
function handleAllow(request: Request, action: AllowAction) {
  const requestClone = request.clone()

  action.request_header_modifications?.remove?.forEach((header) => {
    requestClone.headers.delete(header)
  })

  action.request_header_modifications?.set?.forEach((header) => {
    requestClone.headers.set(header.name, header.value)
  })

  action.request_header_modifications?.append?.forEach((header) => {
    requestClone.headers.append(header.name, header.value)
  })

  return fetchOrigin(requestClone)
}

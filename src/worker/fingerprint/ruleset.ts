import { AGENT_DATA_HEADER } from '../../shared/const'
import { TypedEnv } from '../types'
import { getAllowedOrigin } from '../urlMatching'
import { fetchOrigin } from '../utils/origin'
import { copyRequest } from '../utils/request'
import { z } from 'zod/v4'

const RuleHeader = z.object({
  name: z.string(),
  value: z.string(),
})

/**
 * Represents an HTTP header with name and value.
 */
type RuleHeader = z.infer<typeof RuleHeader>

const AllowAction = z.object({
  type: z.literal('allow'),
  request_header_modifications: z.optional(
    z.object({
      // Headers to remove from the request
      remove: z.optional(z.array(z.string())),
      // Headers to set/replace in the request
      set: z.optional(z.array(RuleHeader)),
      // Headers to append to the request
      append: z.optional(z.array(RuleHeader)),
    })
  ),
})

/**
 * Represents an 'allow' rule action that permits a request to proceed
 * with optional header modifications.
 */
export type AllowAction = z.infer<typeof AllowAction>

const BlockAction = z.object({
  type: z.literal('block'),
  // HTTP status code to return
  status_code: z.number().min(200).max(599),
  // Response headers to include
  headers: z.array(RuleHeader).optional(),
  // Response body content
  body: z.string().optional(),
})

/**
 * Represents a 'block' rule action that blocks a request
 * and returns a custom response.
 */
export type BlockAction = z.infer<typeof BlockAction>

export const RuleActionUnion = z.discriminatedUnion('type', [AllowAction, BlockAction])

export type RuleActionUnion = z.infer<typeof RuleActionUnion>

export const RuleAction = RuleActionUnion.and(
  z.object({
    // The ID of the evaluated ruleset
    ruleset_id: z.string(),
    // The ID of the rule that generated the action. Undefined if no rule was matched.
    rule_id: z.string().optional(),
    // The expression of the rule that generated the action. Undefined if no rule was matched.
    rule_expression: z.string().optional(),
  })
)

/**
 * Represents a rule action from a ingress response.
 * Contains either an 'allow' or 'block' action along with rule metadata.
 */
export type RuleAction = z.infer<typeof RuleAction>

/**
 * A function type that processes HTTP request based on rule actions.
 *
 * The processor handles different action types:
 * - 'block': Returns a blocking response with custom status and headers
 * - 'allow': Modifies request headers and forwards to origin
 * - default: Forwards request to origin without modifications
 *
 * @param ruleAction - The rule action configuration to process
 * @param request - The original HTTP request to process
 * @param env - The environment for the request
 * @returns Request modified based on the rule action
 */
export async function processRuleset(ruleAction: RuleActionUnion, request: Request, env: TypedEnv) {
  console.debug('Processing ruleset:', ruleAction)

  switch (ruleAction.type) {
    case 'block':
      return handleBlock(request, ruleAction, env)

    case 'allow':
      return handleAllow(request, ruleAction)

    default:
      console.warn('Invalid rule type:', ruleAction)
      return fetchOrigin(request)
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
    result.append(name, value)
  })

  return result
}

/**
 * Handles a 'block' action by creating a blocking response.
 *
 * @param request - The original HTTP request to process
 * @param action - The block action configuration containing status code, headers, and body
 * @param env - The environment for the request
 * @returns A Response object that blocks the request with the specified configuration
 */
function handleBlock(request: Request, action: BlockAction, env: TypedEnv) {
  let headers: Headers | null = null
  if (action.headers?.length) {
    headers = createHeaders(action.headers)
  }

  const allowedOrigin = getAllowedOrigin(request, env)
  if (allowedOrigin) {
    // Set the CORS headers to allow the browser to return
    // the response to the JS app
    if (!headers) {
      headers = new Headers()
    }
    headers.set('Access-Control-Allow-Origin', allowedOrigin)
    headers.set('Access-Control-Allow-Credentials', 'true')
    headers.set('Access-Control-Expose-Headers', AGENT_DATA_HEADER)
  }

  console.debug('Blocking request with custom response:', action)
  return new Response(action.body, {
    status: action.status_code,
    ...(headers ? { headers } : {}),
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
  console.debug('Allowing request with header modifications:', action)

  const requestHeaders = new Headers(request.headers)

  action.request_header_modifications?.remove?.forEach((header) => {
    requestHeaders.delete(header)
  })

  action.request_header_modifications?.set?.forEach((header) => {
    requestHeaders.set(header.name, header.value)
  })

  action.request_header_modifications?.append?.forEach((header) => {
    requestHeaders.append(header.name, header.value)
  })

  const requestClone = copyRequest({
    request,
    init: {
      headers: requestHeaders,
    },
  })

  return fetchOrigin(requestClone)
}

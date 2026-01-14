import { isProtectedApiHttpMethod, ProtectedApi, ProtectedApiHttpMethod } from '../../../shared/types'
import { findMatchingRoute, parseRoutes, Route } from '@fingerprintjs/url-matcher'
import { logger } from '../../shared/logger'

/**
 * Function that processes agent data received from the worker for protected API requests.
 *
 * @example
 * ```typescript
 * const data = response.headers.get(AGENT_DATA_HEADER)
 * if (data) {
 *   ctx.processAgentData(data)
 * }
 * ```
 * */
type AgentDataProcessor = (data: string) => void

/**
 * Context interface for patchers that provides access to signals data.
 * Used in instrumentation to share signal information between different patching components.
 */
export type PatcherContext = {
  /**
   * Retrieves the current signals' data.
   * @returns Signals string if set, undefined otherwise
   */
  getSignals: () => Promise<string | undefined>

  /**
   * Processes agent data received from the worker for protected API requests.
   * @param data - Agent data
   * */
  processAgentData: AgentDataProcessor

  /**
   * Determines whether a given URL with a specified HTTP method is classified as protected.
   *
   * @param {string} url - The URL to be evaluated.
   * @param {string} method - The HTTP method (e.g., GET, POST, PUT, DELETE) used in the request.
   * @returns {boolean} Returns true if the URL is protected, otherwise false.
   */
  isProtectedUrl: (url: string, method: string) => boolean
}

/**
 * Writable implementation of PatcherContext that allows both reading and writing.
 * Provides a mutable context for patchers that need to handle specific fingerprinting tasks.
 *
 * @note: Providers can only be set once to prevent accidental overwrites.
 */
export class WritablePatcherContext implements PatcherContext {
  /**
   * Function that resolves to the signal data.
   * */
  private signalsProvider?: () => Promise<string | undefined>

  /**
   * Function that processes agent data received from the worker for protected API requests.
   * */
  private agentDataProcessor?: AgentDataProcessor

  /**
   * Represents an array of route configurations specifically intended for protected
   * endpoints within an API. Each route object in the array defines the route's
   * properties and specifies the HTTP methods allowed for the protected resource.
   */
  private readonly protectedRoutes: Route<{ methods: ProtectedApiHttpMethod[] }>[]

  /**
   * A set containing the uppercased names of HTTP methods that are designated as protected.
   *
   * In most cases, protected methods will be a POST, PUT or DELETE request.
   * In instances where multiple GET requests are being made, this set can be used to quickly filter out these requests without
   * unnecessary route matching.
   */
  private readonly protectedMethods = new Set<ProtectedApiHttpMethod>()

  constructor(protectedApis: ProtectedApi[]) {
    const routeMethodMap: Record<string, ProtectedApiHttpMethod[]> = {}

    protectedApis.forEach((api) => {
      if (!routeMethodMap[api.url]) {
        routeMethodMap[api.url] = []
      }

      this.protectedMethods.add(api.method)
      routeMethodMap[api.url].push(api.method)
    })

    const routeObjects = Object.entries(routeMethodMap).map(([url, methods]) => {
      return {
        url,
        metadata: {
          methods,
        },
      }
    })

    this.protectedRoutes = parseRoutes(routeObjects)
  }

  /**
   * Retrieves the current signals' data using signals' provider.
   * @returns Signals string if set, undefined otherwise
   */
  async getSignals(): Promise<string | undefined> {
    return this.signalsProvider?.()
  }

  /**
   * Sets signals data provider. Can only be called once - subsequent calls will log a warning and return early.
   * @param signalsProvider - The signals provider to store in the context
   */
  setSignalsProvider(signalsProvider: () => Promise<string | undefined>) {
    if (this.signalsProvider) {
      logger.warn('Invalid attempt to set signals provider that are already set.')
      return
    }

    this.signalsProvider = signalsProvider
  }

  /**
   * Sets agent data processor. Can only be called once - subsequent calls will log a warning and return early.
   * @param agentDataProcessor - The agent data processor to store in the context
   * */
  setAgentDataProcessor(agentDataProcessor: AgentDataProcessor) {
    if (this.agentDataProcessor) {
      logger.warn('Invalid attempt to set agent data processor that is already set.')
      return
    }

    this.agentDataProcessor = agentDataProcessor
  }

  /**
   * Processes agent data received from the worker for protected API requests.
   * @param data - Agent data
   * */
  processAgentData(data: string): void {
    this.agentDataProcessor?.(data)
  }

  /**
   * Determines whether the specified URL and method correspond to a protected route.
   *
   * @param {string} url - The URL to check against the protected routes.
   * @param {string} method - The HTTP method to verify for the specified URL.
   * @return {boolean} Returns true if the URL and method match a protected route, otherwise false.
   */
  isProtectedUrl(url: string, method: string): boolean {
    const normalizedMethod = method.toUpperCase()

    if (!isProtectedApiHttpMethod(normalizedMethod)) {
      logger.debug('Method is not a protected API method', normalizedMethod)
      return false
    }

    // Check method first to avoid unnecessary route matching
    if (!this.protectedMethods.has(normalizedMethod)) {
      logger.debug('Method not protected:', normalizedMethod)
      return false
    }

    const urlToMatch = new URL(url, location.origin)
    logger.debug('Matching URL:', urlToMatch.href)
    const matchedRoute = findMatchingRoute(urlToMatch, this.protectedRoutes)

    if (matchedRoute) {
      return Boolean(matchedRoute.metadata?.methods.includes(normalizedMethod))
    }

    return false
  }
}

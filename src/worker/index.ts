import { handleRequest } from './handler'
import { TypedEnv } from './types'
import { isMonitorMode } from './env'

export default {
  async fetch(request, env, ctx) {
    if (isMonitorMode(env)) {
      console.debug('No ruleset ID provided, worker will work in monitor mode.')
      ctx.passThroughOnException()
    }
    return handleRequest(request, env)
  },
} satisfies ExportedHandler<TypedEnv>

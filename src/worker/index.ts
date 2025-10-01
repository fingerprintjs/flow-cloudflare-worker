import { handleRequest } from './handler'
import { TypedEnv } from './types'

export default {
  async fetch(request, env) {
    return handleRequest(request, env)
  },
} satisfies ExportedHandler<TypedEnv>

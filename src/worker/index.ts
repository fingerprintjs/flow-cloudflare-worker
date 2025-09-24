import { handleRequest } from './handler'
import { EnvWithAssets } from './types'

export default {
  async fetch(request, env) {
    return handleRequest(request, env)
  },
} satisfies ExportedHandler<EnvWithAssets>

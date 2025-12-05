import { DurableObject } from 'cloudflare:workers'

export class TokenStore extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  async listAll() {
    return this.ctx.storage.list()
  }

  async storeRequestId(detectionToken: string, requestId: string) {
    await this.ctx.storage.put(detectionToken, requestId)
  }

  async getRequestId(detectionToken: string): Promise<string | undefined> {
    return this.ctx.storage.get<string>(detectionToken)
  }

  async deleteRequestId(detectionToken: string): Promise<void> {
    this.ctx.storage.delete(detectionToken)
  }
}

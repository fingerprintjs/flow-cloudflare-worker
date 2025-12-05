import { DurableObject } from 'cloudflare:workers'

export type TokenEntry = {
  signals: string
  requestId?: string
}

export class TokenStore extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  async listAll(): Promise<Map<string, TokenEntry>> {
    return this.ctx.storage.list<TokenEntry>()
  }

  async storeEntry(detectionToken: string, entry: TokenEntry) {
    await this.ctx.storage.put(detectionToken, entry)
  }

  async getEntry(detectionToken: string): Promise<TokenEntry | undefined> {
    return this.ctx.storage.get<TokenEntry>(detectionToken)
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

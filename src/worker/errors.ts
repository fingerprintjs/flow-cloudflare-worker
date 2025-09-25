import { Env } from './types'

export type FlowErrorParams = {
  message: string
  httpStatus?: number
}

export class FlowError extends Error {
  readonly httpStatus: number

  constructor(params: FlowErrorParams) {
    super(params.message)
    this.httpStatus = params.httpStatus ?? 500
  }
}

export class MissingVariableError extends FlowError {
  constructor(variable: keyof Env) {
    super({
      message: `${variable} is not set.`,
    })
  }
}

export class AssetsNotAvailableError extends FlowError {
  constructor() {
    super({
      message: 'env.ASSETS are not available. This is most likely caused by an invalid wrangler.jsonc configuration.',
    })
  }
}

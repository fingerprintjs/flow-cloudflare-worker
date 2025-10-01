import { TypedEnv } from './types'

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
  constructor(variable: keyof TypedEnv) {
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

export class SignalsNotAvailableError extends FlowError {
  constructor() {
    super({
      message: 'Signals were not found in this protected API call.',
      httpStatus: 403,
    })
  }
}

export class HeaderMissingError extends FlowError {
  constructor(header: string) {
    super({
      message: `${header} header is missing.`,
      httpStatus: 403,
    })
  }
}

export class IngressRequestFailedError extends FlowError {
  constructor(message: string, status: number) {
    super({
      message: `Ingress request failed with ${status} status: ${message}`,
    })
  }
}

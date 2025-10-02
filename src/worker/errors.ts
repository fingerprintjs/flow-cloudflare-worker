import { TypedEnv } from './types'

export type FlowErrorParams = {
  message: string
  httpStatus?: number
  isPrivate?: boolean
}

export class FlowError extends Error {
  readonly httpStatus: number

  // When set to true, the message will not be returned in the response.
  readonly isPrivate: boolean = true

  constructor(params: FlowErrorParams) {
    super(params.message)

    if (typeof params.isPrivate === 'boolean') {
      this.isPrivate = params.isPrivate
    }

    this.httpStatus = params.httpStatus ?? 500
  }
}

export class MissingVariableError extends FlowError {
  constructor(variable: keyof TypedEnv) {
    super({
      message: `${variable} is not set.`,
      isPrivate: false,
    })
  }
}

export class AssetsNotAvailableError extends FlowError {
  constructor() {
    super({
      message: 'env.ASSETS are not available. This is most likely caused by an invalid wrangler.jsonc configuration.',
      isPrivate: false,
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
      httpStatus: 403,
    })
  }
}

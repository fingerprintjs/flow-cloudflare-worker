import { FlowError } from '../errors'
import { IdentificationEvent } from './identificationClient'
import { getIp } from '../utils/headers'

const ALLOWED_REQUEST_TIMESTAMP_DIFF_MS = 3000

export class TamperingError extends FlowError {
  constructor(message: string) {
    super({
      message,
      isPrivate: true,
      httpStatus: 403,
    })
  }
}

type TamperingHandler = {
  verify: (event: IdentificationEvent, request: Request) => void | Promise<void>
}

const tamperingHandlers: TamperingHandler[] = [
  {
    verify: (event) => {
      if (new Date().valueOf() - event.timestamp.valueOf() > ALLOWED_REQUEST_TIMESTAMP_DIFF_MS) {
        throw new TamperingError('Old identification request, potential replay attack.')
      }
    },
  },
  {
    verify: (event, request) => {
      const origin = new URL(request.headers.get('origin')!).origin
      const identificationOrigin = new URL(event.url).origin

      if (origin !== identificationOrigin) {
        throw new TamperingError(
          `Unexpected origin (${origin} is not ${identificationOrigin}), potential replay attack.`
        )
      }
    },
  },
  {
    verify: async (event, request) => {
      const requestIp = await getIp(request.headers)

      if (requestIp !== event.ip_address) {
        throw new TamperingError('Unexpected IP address, potential replay attack.')
      }
    },
  },
]

export async function handleTampering(event: IdentificationEvent, request: Request) {
  for (const handler of tamperingHandlers) {
    try {
      await handler.verify(event, request)
    } catch (error) {
      if (error instanceof TamperingError) {
        console.error('Tampering verification failed:', error.message, event)
        throw error
      }

      console.error('Error verifying tampering protection:', error)

      throw new TamperingError('Tampering verification failed.')
    }
  }
}

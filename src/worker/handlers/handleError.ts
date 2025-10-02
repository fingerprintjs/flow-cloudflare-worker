import { FlowError } from '../errors'

export function handleError(error: unknown) {
  console.error('Error handling request', error)

  if (error instanceof FlowError) {
    return new Response(error.isPrivate ? '' : error.message, { status: error.httpStatus })
  }

  return new Response('Internal Flow Error', { status: 500 })
}

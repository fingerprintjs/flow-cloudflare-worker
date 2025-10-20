import { createServer, IncomingMessage, ServerResponse } from 'node:http'

type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void

type MockServerRequest = IncomingMessage & { body?: Buffer }

/**
 * Represents a mock server for testing HTTP requests and responses.
 */
export class MockServer {
  private _requests: MockServerRequest[] = []

  private server = createServer(async (req, res) => {
    this.middlewares.forEach((middleware) => middleware(req, res))

    const body = await MockServer.readBody(req)
    Object.assign(req, { body })
    this._requests.push(req)

    if (this.requestHandler) {
      this.requestHandler(req, res)
      return
    }

    res.writeHead(200)
    res.end('OK')
  })

  private middlewares: RequestHandler[] = []

  requestHandler?: RequestHandler | undefined

  get requests() {
    return this._requests
  }

  constructor() {}

  listen(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.server.listen(3000, () => {
        resolve()
      })
    })
  }

  close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  getUrl(path: string) {
    return `http://localhost:3000${path}`
  }

  use(middleware: RequestHandler) {
    this.middlewares.push(middleware)
    return this
  }

  cleanup() {
    this._requests = []
    this.middlewares = []
    this.requestHandler = undefined
  }

  private static readBody(req: IncomingMessage) {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []

      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      req.on('end', () => {
        resolve(Buffer.concat(chunks))
      })

      req.on('error', (err) => {
        reject(err)
      })
    })
  }
}

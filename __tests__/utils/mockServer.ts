import { createServer, IncomingMessage, ServerResponse } from 'node:http'

type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void

export class MockServer {
  private _requests: IncomingMessage[] = []

  private server = createServer((req, res) => {
    this._requests.push(req)

    this.middlewares.forEach((middleware) => middleware(req, res))

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
}

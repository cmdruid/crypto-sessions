import { Util } from '@cmdcode/crypto-utils'
import { CryptoSession } from './session.js'
import { schema } from './schema.js'
import { Buff } from '@cmdcode/buff-utils'

export interface FetchOptions extends RequestInit {
  hostname?: string
  fetcher?: (
    input: RequestInfo | URL,
    init?: RequestInit | undefined
  ) => Promise<Response>
}

export interface SecureBody {
  isEncoded: boolean
  type: string
  data: string
  url: string
}

export interface SecureResponse {
  ok: boolean
  status: number
  statusText: string
  headers: Headers
  data?: object | string
  err?: unknown
  res: Response
}

export class SecureFetch extends Function {
  public readonly hostname: string
  public readonly session: CryptoSession
  public readonly fetcher: Function
  public readonly options: RequestInit

  static generate(
    peerKey: string | Uint8Array,
    options?: FetchOptions
  ): SecureFetch {
    return new SecureFetch(peerKey, Util.getRandBytes(32), options)
  }

  constructor(
    peerKey: string | Uint8Array,
    secretKey: string | Uint8Array,
    options?: FetchOptions
  ) {
    // Unpack custom params from options object.
    const { hostname, fetcher, ...opts } = options ?? {}
    // Initialize parent function.
    super('...args', 'return this.fetch(...args)')
    // Assign attributes.
    this.session = new CryptoSession(peerKey, secretKey)
    this.hostname = hostname ?? ''
    this.options = opts ?? {}
    this.fetcher = fetcher ?? fetch
    return this.bind(this)
  }

  getOptions(options?: RequestInit): RequestInit {
    return { ...options, ...this.options }
  }

  getAuthHeaders(
    token: string,
    type?: string,
    options?: RequestInit
  ): HeadersInit {
    return new Headers({
      'content-type': type ?? 'text/plain',
      authorization: token,
      ...options?.headers,
    })
  }

  async fetch(
    path: RequestInfo | URL,
    options: FetchOptions
  ): Promise<SecureResponse> {
    if (path instanceof URL) {
      path = path.toString()
    }
    if (path instanceof Request) {
      path = path.url
    }
    const url = this.hostname + path
    const opt = this.getOptions(options)
    if (opt.method === undefined || opt.method === 'GET') {
      return this.get(url, opt)
    }
    if (opt.method === 'POST') {
      return this.post(url, opt)
    } else {
      return this.fetcher(url, opt)
    }
  }

  async get(path: string, options: RequestInit): Promise<SecureResponse> {
    const { token } = await this.session.encode(path)
    const mimeType = 'text/plain'
    options.headers = this.getAuthHeaders(token, mimeType, options)
    return this.fetcher(path, options).then(async (res: Response) =>
      this.handleResponse(res)
    )
  }

  async post(path: string, options: RequestInit): Promise<SecureResponse> {
    const type = typeof options.body
    if (type !== 'undefined') {
      const payload = schema.body.parse(options.body)
      const padding = new Buff(Util.getRandBytes(32)).toB64url()
      const { token, data } = await this.session.encode(payload)
      const mimeType = 'application/json'
      options.headers = this.getAuthHeaders(token, mimeType, options)
      options.body = JSON.stringify({ isEncoded: true, data, padding, type })
    }
    return this.fetcher(path, options).then(async (res: Response) =>
      this.handleResponse(res)
    )
  }

  async handleResponse(res: Response): Promise<SecureResponse> {
    const { ok, status, statusText, headers } = res
    let data, err
    try {
      const contentType = headers.get('content-type') ?? ''
      const token = schema.token.parse(headers.get('authorization'))
      const payload = await res.text()
      data = await this.session.decode(token, payload)
      if (contentType.startsWith('application/json')) {
        data = JSON.parse(data)
      }
    } catch (err) {
      console.log(err)
    }
    return { ok, status, statusText, headers, res, data, err }
  }
}

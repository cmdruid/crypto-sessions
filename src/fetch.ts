import { Buff } from '@cmdcode/buff-utils'
import { CryptoSession } from './session.js'
import { schema } from './schema.js'
import { reviveData } from './utils.js'
import { Token } from './token.js'

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit | undefined
) => Promise<Response>

export interface SecureFetchOptions extends RequestInit {
  hostname? : string
  fetcher?  : Fetcher
}

export interface SecureResponse extends Response {
  token? : string
  data?  : object | string
  err?   : any
}

export class SecureFetch extends Function {
  public readonly session   : CryptoSession
  public readonly hostname  : string
  public readonly fetcher   : Fetcher
  public readonly options   : RequestInit

  static generate(
    peerKey  : string | Uint8Array,
    options? : SecureFetchOptions
  ) : SecureFetch {
    const privKey = Buff.random(32).toBytes()
    return new SecureFetch(peerKey, privKey, options)
  }

  constructor(
    peerKey   : string | Uint8Array,
    secretKey : string | Uint8Array,
    options?  : SecureFetchOptions
  ) {
    // Unpack custom params from options object.
    const { hostname, fetcher, ...opts } = options ?? {}
    // Initialize parent function.
    super('...args', 'return this.fetch(...args)')
    // Assign attributes.
    this.session  = new CryptoSession(peerKey, secretKey)
    this.hostname = hostname ?? ''
    this.options  = opts ?? {}
    this.fetcher  = fetcher ?? fetch
    return this.bind(this)
  }

  getSession() : CryptoSession {
    return this.session
  }

  concatOptions(options?: RequestInit): RequestInit {
    return { ...options, ...this.options }
  }

  concatHeaders(
    headers  : HeadersInit,
    options? : RequestInit
  ) : HeadersInit {
    return { ...options?.headers, ...headers }
  }

  checkHeaders(headers : Headers) : boolean {
    const auth = headers.get('authorization')
    const type = headers.get('content-type')
    return (
      typeof auth === 'string' && typeof type === 'string'
      && schema.encoded.safeParse(auth).success
      && type.includes('text')
    )
  }

  setAuthHeaders(
    token    : string,
    options? : RequestInit
  ) : HeadersInit {
    return this.concatHeaders({ authorization: token }, options)
  }

  async fetch(
    path    : RequestInfo | URL,
    options : SecureFetchOptions
  ) : Promise<SecureResponse> {
    
    if (path instanceof URL) {
      // Convert URL object to string.
      path = path.toString()
    }
    if (path instanceof Request) {
      // Unpack Request and get URL string.
      options = this.concatOptions(path)
      path = path.url
    }
    // Concatenate any provided options with the defaults.
    const opt = this.concatOptions(options)
    // Prefix path with the default hostname, if any.
    const url = this.hostname + path
    // Process the request based on method.
    if (opt.method === undefined || opt.method === 'GET') {
      // If GET or undefined, process as GET request.
      return this.get(url, opt)
    }
    if (opt.method === 'POST') {
      // If POST, process as POST request.
      return this.post(url, opt)
    }
    // All other methods are handled 
    // by the default fetcher method.
    return this.fetcher(url, opt)
  }

  async get(
    path    : string, 
    options : RequestInit
  ) : Promise<SecureResponse> {
    // Get token for request URL path.
    const { token } = await this.session.encode(path)
    // Add token to request headers.
    options.headers = this.setAuthHeaders(token, options)
    // Dispatch request, then handle the response.
    return this.fetcher(path, options).then(async (res: Response) =>
      this.handleResponse(res)
    )
  }

  async post(
    path    : string, 
    options : RequestInit
  ) : Promise<SecureResponse> {
    // Set content type to JSON.
    const mimeType = { 'content-type': 'application/json' }
    // Normalize contents of request body.
    const content  = schema.body.parse(options.body)
    // Get token and encrypted contents.
    const { token, data } = await this.session.encode(content)
    // Set the headers and body of the request.
    options.headers = this.setAuthHeaders(token, options)
    options.headers = this.concatHeaders(mimeType, options)
    options.body = JSON.stringify({ data })
    // Dispatch request, then handle the response.
    return this.fetcher(path, options)
      .then(async (res: Response) => this.handleResponse(res))
  }

  async handleResponse(res : SecureResponse) : Promise<SecureResponse> {
    try {
      if (!this.checkHeaders(res.headers)) {
        throw TypeError('Invalid response headers!')
      }
      const token   = Token.fromHeaders(res.headers)
      const data    = await res.text()
      const content = await this.session.decode(token, data)
      res.data = reviveData(content)
    } catch (err) { res.err = err }
    return res
  }
}

import { Buff }   from '@cmdcode/buff-utils'
import { CryptoSession } from './session.js'
import { Schema } from './schema.js'
import { Token }  from './token.js'

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
  public options : RequestInit

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

  get method() : string {
    return this.options.method ?? 'GET'
  }

  get body() : BodyInit | null | undefined {
    return this.options.body
  }

  set body(body : BodyInit | null | undefined) {
    this.options.body = body
  }

  addOptions(options?: RequestInit): void {
    this.options = { ...this.options, ...options }
  }

  addHeaders(headers  : HeadersInit) : void {
    this.options.headers = { ...this.options?.headers, ...headers }
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
      this.addOptions(path)
      path = path.url
    }
    // Concatenate any provided options with the defaults.
    this.addOptions(options)
    // Prefix path with the default hostname, if any.
    const url = this.hostname + path
    // Process the request based on method.
    if (this.method === undefined || this.method === 'GET') {
      // If GET or undefined, process as GET request.
      return this.get(url)
    }
    if (this.method === 'POST') {
      // If POST, process as POST request.
      return this.post(url)
    }
    // All other methods are handled 
    // by the default fetcher method.
    return this.fetcher(url, this.options)
  }

  async get(path : string) : Promise<SecureResponse> {
    // Get token for request URL path.
    const { token } = await this.session.encode(path)
    // Add token to request headers.
    this.addHeaders({ authorization: token.encoded })
    // Dispatch request, then handle the response.
    return this.fetcher(path, this.options).then(async (res: Response) =>
      this.handleResponse(res)
    )
  }

  async post(path : string) : Promise<SecureResponse> {
    // Normalize contents of request body.
    const content = Schema.body.parse(this.body)
    // Get token and encrypted contents.
    const { token, data } = await this.session.encode(content)
    // Set the headers and body of the request.
    this.addHeaders({ 
      'authorization' : token.encoded,
      'content-type'  : 'application/json' 
    })
    this.body = JSON.stringify({ data })
    // Dispatch request, then handle the response.
    return this.fetcher(path, this.options)
      .then(async (res: Response) => this.handleResponse(res))
  }

  async handleResponse(res : SecureResponse) : Promise<SecureResponse> {
    
    try {
      if (!res.ok) throw TypeError(`Failed request!`)
      const encoded = res.headers.get('authorization')
      const token   = Token.import(encoded)
      const payload = await res.text()
      const { data, isValid } = await this.session.decode(token, payload)
      if (!isValid) throw TypeError('Invalid signature!')
      res.data = data
    } catch (err) { res.err = err }
    return res
  }
}

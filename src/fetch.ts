import { Buff, Json }    from '@cmdcode/buff-utils'
import { Schema }        from './schema.js'
import { Token }         from './token.js'
import { CryptoSession } from './session.js'

export type Fetcher = (
  input : RequestInfo | URL,
  init ?: RequestInit | undefined
) => Promise<Response>

export interface SecureInstance {
  fetch   : SecureFetch
  session : CryptoSession
}

export interface SecureFetchOptions extends RequestInit {
  hostname ?: string
  fetcher  ?: Fetcher
  verbose  ?: boolean
}

export interface SecureResponse extends Response {
  token ?: string
  data  ?: string | Json
  err   ?: any
}

export class SecureFetch extends Function {
  public readonly session  : CryptoSession
  public readonly hostname : string
  public readonly fetcher  : Fetcher
  public readonly verbose  : boolean
  public options : RequestInit

  static create (
    peerKey   : string | Uint8Array,
    secretKey : string | Uint8Array,
    options ?: SecureFetchOptions
  ) : SecureInstance {
    return {
      fetch   : new SecureFetch(peerKey, secretKey, options),
      session : new CryptoSession(peerKey, secretKey)
    }
  }

  static generate (
    peerKey  : string | Uint8Array,
    options ?: SecureFetchOptions
  ) : SecureInstance {
    const privKey = Buff.random(32).toBytes()
    return SecureFetch.create(peerKey, privKey, options)
  }

  constructor (
    peerKey   : string | Uint8Array,
    secretKey : string | Uint8Array,
    options ?: SecureFetchOptions
  ) {
    // Unpack custom params from options object.
    const {
      hostname, fetcher, verbose, ...opts
    } = options ?? {}
    // Initialize parent function.
    super('...args', 'return this.fetch(...args)')
    // Assign attributes.
    this.session  = new CryptoSession(peerKey, secretKey)
    this.hostname = hostname ?? ''
    this.options  = opts     ?? {}
    this.verbose  = verbose  ?? false
    this.fetcher  = fetcher  ?? fetch
    return this.bind(this)
  }

  async fetch (
    path    : RequestInfo | URL,
    options : SecureFetchOptions
  ) : Promise<SecureResponse> {
    if (path instanceof URL) {
      // Convert URL object to string.
      path = path.toString()
    }
    if (path instanceof Request) {
      // Unpack Request and get URL string.
      options = concatReq(options, path)
      path = path.url
    }
    // Concatenate any provided options with the defaults.
    const opt = concatReq(this.options, options)
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

  async get (
    path : string,
    opt  : RequestInit
  ) : Promise<SecureResponse> {
    // Get token for request URL path.
    const { token } = await this.session.encode(path)
    // Add token to request headers.
    addHeaders(opt, { authorization: token.encoded })
    // If verbose, log the final request object.
    if (this.verbose) logRequest(path, opt)
    // Dispatch request, then handle the response.
    return this.fetcher(path, opt)
      .then(async (res : Response) => this.handleResponse(res))
  }

  async post (
    path : string,
    opt  : RequestInit
  ) : Promise<SecureResponse> {
    // Normalize contents of request body.
    const content = Schema.body.parse(opt.body) ?? path
    // Get token and encrypted contents.
    const { token, data } = await this.session.encode(content)
    // Set the headers of the request.
    addHeaders(opt, {
      authorization  : token.encoded,
      'content-type' : 'application/json'
    })
    // Set the body of the request.
    opt.body = JSON.stringify({ data })
    // If verbose, log the final request object.
    if (this.verbose) logRequest(path, opt)
    // Dispatch request, then handle the response.
    return this.fetcher(path, opt)
      .then(async (res : Response) => this.handleResponse(res))
  }

  async handleResponse (res : SecureResponse) : Promise<SecureResponse> {
    try {
      if (!res.ok) throw TypeError('Failed request!')
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

function concatReq (
  ...obj : RequestInit[]
) : RequestInit {
  let ret : RequestInit = {}
  obj.forEach(o => { ret = { ...ret, ...o } })
  return ret
}

function addHeaders (
  options : RequestInit,
  headers : HeadersInit
) : void {
  if (options.headers instanceof Headers) {
    const entries = options.headers.entries()
    options.headers = Object.fromEntries(entries)
  }
  options.headers = { ...options.headers, ...headers }
}

function logRequest (path : string, opt : RequestInit) : void {
  console.log(`Path: ${path}\nRequest:\n`, opt)
}

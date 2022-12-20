import { FetchOptions, SecureFetch } from '../src/fetch.js'
import { Util, Keys } from '@cmdcode/crypto-utils'

class Wrapper extends Function {
  public fetcher: SecureFetch
  constructor(peerKey: string | Uint8Array, secretKey: string | Uint8Array) {
    super('...args', 'return this.fetch(...args)')
    this.fetcher = new SecureFetch(peerKey, secretKey)
    return this.bind(this)
  }

  async fetch(path: string, options: FetchOptions) {
    return this.fetcher.get(path, options)
  }
}
const keypair = Keys.generateKeyPair()

const fetch = new Wrapper(keypair.publicKey, Util.getRandBytes(32))

let res = await fetch('/api')

console.log(res)

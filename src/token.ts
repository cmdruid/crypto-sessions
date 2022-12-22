import { Buff } from '@cmdcode/buff-utils'
import { schema } from './schema.js'
import * as Utils from './utils.js'

export interface TokenData {
  publicKey : Uint8Array
  signature : Uint8Array
}

export class Token {

  public publicKey : Uint8Array
  public signature : Uint8Array

  static import(encoded : string) : Token {
    const { publicKey, signature } = Token.parse(encoded)
    return new Token(publicKey, signature)
  }

  static parse(encoded : string) : TokenData {
    const decoded = schema.decoded.parse(encoded)
    return {
      publicKey : decoded.slice(0, 33),
      signature : decoded.slice(33)
    }
  }

  static fromHeaders(headers : any) : Token {
    // Read authorization header based on header type.
    const tokenData = (Utils.isHeaderMap(headers))
      ? headers.get('authorization')
      : headers.authorization
    return Token.import(tokenData)
  }

  static checkHeaders() : boolean {
    return true
  }

  constructor(
    publicKey : string | Uint8Array,
    signature : string | Uint8Array
  ) {
    this.publicKey = Buff.normalizeBytes(publicKey)
    this.signature = Buff.normalizeBytes(signature)
  }

  get pubHex() : string {
    return Buff.buff(this.publicKey).toHex()
  }

  get sigHex() : string {
    return Buff.buff(this.signature).toHex()
  }

  get encoded() : string {
    const bytes = [ this.publicKey, this.signature ]
    return Buff.join(bytes).toB64url()
  }

  issuedBy(key : string) : boolean {
    return (key === this.pubHex)
  }

  setHeaders(headers : any) : void {
    if (Utils.isHeaderMap(headers)) {
      headers.set('authorization', this.encoded)
    } else {
      headers.authorization = this.encoded
    }
  }
}
